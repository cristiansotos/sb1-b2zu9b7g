/*
  # Family Invitation Email Trigger

  ## Overview
  Automatically sends invitation emails when a new family invitation is created.
  Uses a database trigger to call the send-family-invitation Edge Function.

  ## Changes
  1. Creates a trigger function that fires after INSERT on family_invitations
  2. Trigger only processes 'pending' invitations with valid emails
  3. Makes HTTP POST request to the send-family-invitation Edge Function
  4. Includes error handling to prevent transaction rollback on email failures
  5. Logs all email sending attempts for debugging

  ## Security
  - Uses Supabase service role key for Edge Function authentication
  - Only processes invitations that pass RLS policies
  - Validates email format before attempting to send

  ## Error Handling
  - Catches and logs errors without blocking invitation creation
  - Failed emails are logged but don't prevent invitation record from being created
  - Admins can monitor failed emails via logs
*/

-- Function to send invitation email via Edge Function
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Only process pending invitations
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Validate email format
  IF NEW.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE WARNING 'Invalid email format for invitation %', NEW.id;
    RETURN NEW;
  END IF;

  -- Get Supabase URL from environment
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-family-invitation';
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  -- If settings not available, use extension to make request
  BEGIN
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
    RAISE WARNING 'Failed to queue invitation email for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_send_invitation_email ON family_invitations;

-- Create trigger that fires after insert
CREATE TRIGGER trigger_send_invitation_email
  AFTER INSERT ON family_invitations
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_email();

-- Note: This trigger requires pg_net extension to be enabled
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;