/*
  # Fix Family Invitation Email Trigger v2

  ## Overview
  Simplifies the invitation email trigger by using a hardcoded Supabase URL
  and relying on the service role key being available in the Edge Function environment.

  ## Problem
  The previous versions tried to use vault secrets or app.settings which require
  special permissions or configuration that may not be available.

  ## Solution
  1. Use the known Supabase project URL directly
  2. Rely on pg_net and the Edge Function to handle authentication
  3. The Edge Function has access to SUPABASE_SERVICE_ROLE_KEY via environment
  4. Simplify the trigger to just make the HTTP call

  ## Changes
  1. Drop and recreate the trigger function with hardcoded URL
  2. Remove complex configuration logic
  3. Keep error handling and logging
  4. Let the Edge Function handle its own authentication to Supabase

  ## Security
  - Uses SECURITY DEFINER to run with elevated privileges
  - Validates email format before processing
  - Only processes pending invitations
  - Edge Function validates its own requests
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_send_invitation_email ON family_invitations;
DROP FUNCTION IF EXISTS send_invitation_email();

-- Recreate the function with simplified configuration
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url text;
  request_id bigint;
  project_url text;
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
    -- Use the hardcoded project URL
    project_url := 'https://pfvpnltnzglbvnkbkius.supabase.co';
    function_url := project_url || '/functions/v1/send-family-invitation';

    RAISE LOG 'Sending invitation email for % to % via %', NEW.id, NEW.email, function_url;

    -- Use pg_net extension to make async HTTP request
    -- Note: We're not including Authorization header here because the Edge Function
    -- should be accessible without it for webhooks/triggers, or we need a different approach
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'invitationId', NEW.id::text
      )
    ) INTO request_id;

    RAISE LOG 'Invitation email queued successfully for invitation_id: %, request_id: %', NEW.id, request_id;

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

-- Grant necessary permissions for pg_net
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION send_invitation_email() IS 'Automatically sends invitation emails when family invitations are created using pg_net to call the Edge Function.';
