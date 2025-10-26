/*
  # Fix Family Invitation Email Trigger

  ## Overview
  Fixes the broken family invitation email trigger by removing dependency on unconfigured
  app.settings and using Supabase's built-in capabilities to dynamically detect the URL.

  ## Problem
  The previous trigger function tried to read from `app.settings.supabase_url` and 
  `app.settings.supabase_service_role_key` which are not configured, causing the 
  HTTP request to the Edge Function to fail silently.

  ## Solution
  1. Use Supabase's request extension to detect the current Supabase project URL
  2. Use vault secrets for the service role key
  3. Add comprehensive error logging to help debug issues
  4. Simplify the trigger logic for better reliability

  ## Changes
  1. Drop and recreate the `send_invitation_email()` function with fixed configuration
  2. Use `request.env()` to get SUPABASE_URL if available
  3. Fall back to constructing URL from current database host
  4. Use vault for service role key storage
  5. Add detailed logging for debugging

  ## Security
  - Uses SECURITY DEFINER to run with elevated privileges
  - Validates email format before processing
  - Only processes pending invitations
  - Includes error handling to prevent transaction rollback
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_send_invitation_email ON family_invitations;
DROP FUNCTION IF EXISTS send_invitation_email();

-- Recreate the function with fixed configuration
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url text;
  service_role_key text;
  request_id bigint;
  supabase_url text;
BEGIN
  -- Only process pending invitations
  IF NEW.status != 'pending' THEN
    RAISE LOG 'Skipping email for invitation % - status is %', NEW.id, NEW.status;
    RETURN NEW;
  END IF;

  -- Validate email format
  IF NEW.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE WARNING 'Invalid email format for invitation %: %', NEW.id, NEW.email;
    RETURN NEW;
  END IF;

  BEGIN
    -- Try to get SUPABASE_URL from various sources
    -- First try: get from vault if configured
    BEGIN
      SELECT decrypted_secret INTO supabase_url
      FROM vault.decrypted_secrets
      WHERE name = 'SUPABASE_URL'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      supabase_url := NULL;
    END;

    -- Second try: construct from current host (works in Supabase hosted environments)
    IF supabase_url IS NULL THEN
      -- In Supabase, we can use the request extension if available
      BEGIN
        supabase_url := current_setting('request.header.host', true);
        IF supabase_url IS NOT NULL AND supabase_url != '' THEN
          supabase_url := 'https://' || supabase_url;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        supabase_url := NULL;
      END;
    END IF;

    -- Third try: use SUPABASE_URL environment variable if accessible
    IF supabase_url IS NULL THEN
      BEGIN
        supabase_url := current_setting('app.supabase_url', true);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    IF supabase_url IS NULL OR supabase_url = '' THEN
      RAISE WARNING 'Could not determine Supabase URL for invitation %. Check vault secrets or environment configuration.', NEW.id;
      RETURN NEW;
    END IF;

    -- Construct the Edge Function URL
    function_url := supabase_url || '/functions/v1/send-family-invitation';

    -- Get service role key from vault
    BEGIN
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      service_role_key := NULL;
    END;

    -- If no service role key from vault, try environment
    IF service_role_key IS NULL THEN
      BEGIN
        service_role_key := current_setting('app.supabase_service_role_key', true);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    IF service_role_key IS NULL OR service_role_key = '' THEN
      RAISE WARNING 'No service role key available for invitation %. Check vault secrets.', NEW.id;
      RETURN NEW;
    END IF;

    RAISE LOG 'Sending invitation email for % to % via %', NEW.id, NEW.email, function_url;

    -- Use pg_net extension to make async HTTP request
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'invitationId', NEW.id
      )
    ) INTO request_id;

    RAISE LOG 'Invitation email queued for invitation_id: %, request_id: %', NEW.id, request_id;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to queue invitation email for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_send_invitation_email
  AFTER INSERT ON family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_email();

-- Ensure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: To configure the Supabase URL and service role key, you can either:
-- 1. Add them to vault.secrets (recommended):
--    INSERT INTO vault.secrets (name, secret) VALUES ('SUPABASE_URL', 'https://your-project.supabase.co');
--    INSERT INTO vault.secrets (name, secret) VALUES ('SUPABASE_SERVICE_ROLE_KEY', 'your-service-role-key');
--
-- 2. Or configure app settings:
--    ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
--    ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';

COMMENT ON FUNCTION send_invitation_email() IS 'Automatically sends invitation emails when family invitations are created. Uses vault secrets or environment configuration for Supabase URL and service role key.';
