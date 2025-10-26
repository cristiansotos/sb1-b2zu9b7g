/*
  # Set Initial Admin User

  ## Purpose
  This migration sets the initial admin user for the application.
  This should be run ONCE during initial deployment.

  ## Security Note
  After running this migration, delete or modify it to remove the email address.
  Additional admins should be set via Supabase Dashboard SQL Editor:

  UPDATE user_profiles SET is_admin = true WHERE email = 'new-admin@example.com';

  ## Instructions
  Before applying this migration:
  1. Replace 'YOUR_ADMIN_EMAIL_HERE' with your actual admin email
  2. Ensure this user has already signed up in the application
  3. Apply the migration
  4. Verify admin access works
  5. Delete or secure this migration file
*/

-- Set admin user (REPLACE EMAIL BEFORE RUNNING)
DO $$
BEGIN
  -- IMPORTANT: Replace 'YOUR_ADMIN_EMAIL_HERE' with your actual admin email
  UPDATE user_profiles
  SET is_admin = true
  WHERE email = 'YOUR_ADMIN_EMAIL_HERE';

  -- Verify the update worked
  IF NOT FOUND THEN
    RAISE NOTICE 'No user found with the specified email. Make sure the user has signed up first.';
  ELSE
    RAISE NOTICE 'Admin user successfully set!';
  END IF;
END $$;

-- To add more admins later, run this in SQL Editor:
-- UPDATE user_profiles SET is_admin = true WHERE email = 'another-admin@example.com';

-- To remove admin privileges:
-- UPDATE user_profiles SET is_admin = false WHERE email = 'admin@example.com';

-- To list all admin users:
-- SELECT id, email, first_name, last_name, is_admin, created_at
-- FROM user_profiles
-- WHERE is_admin = true;
