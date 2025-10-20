# Google OAuth Setup Guide

## Overview
This guide will help you enable Google OAuth authentication for your Supabase project.

## Prerequisites
- Access to your Supabase Dashboard
- A Google Cloud Console account
- Your application URLs (development and production)

---

## Part 1: Configure Google Cloud Console

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Family Memoir App")
5. Click "Create"

### Step 2: Enable Google+ API
1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Family Memoir (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Save and Continue" (default scopes are fine)
7. On the "Test users" page, you can add test users or skip
8. Click "Save and Continue" and then "Back to Dashboard"

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Give it a name (e.g., "Family Memoir Web Client")
5. Under "Authorized JavaScript origins", add:
   - `https://pfvpnltnzglbvnkbkius.supabase.co`
   - Your production URL (when you have one)
6. Under "Authorized redirect URIs", add:
   - `https://pfvpnltnzglbvnkbkius.supabase.co/auth/v1/callback`
7. Click "Create"
8. **IMPORTANT**: Copy your **Client ID** and **Client Secret** - you'll need these next

---

## Part 2: Configure Supabase Dashboard

### Step 1: Open Supabase Authentication Settings
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `pfvpnltnzglbvnkbkius`
3. Navigate to "Authentication" in the left sidebar
4. Click on "Providers"

### Step 2: Enable Google Provider
1. Find "Google" in the list of providers
2. Toggle it to "Enabled"
3. Paste your **Client ID** from Google Cloud Console
4. Paste your **Client Secret** from Google Cloud Console
5. Click "Save"

### Step 3: Configure Site URL
1. In the Authentication section, click on "URL Configuration"
2. Set your **Site URL**:
   - Development: `http://localhost:5173`
   - Production: Your production domain (e.g., `https://yourdomain.com`)
3. Add to **Redirect URLs**:
   - `http://localhost:5173/dashboard`
   - `https://yourdomain.com/dashboard` (for production)
4. Click "Save"

### Step 4: Disable Email Confirmation (Temporary)
1. In the Authentication section, click on "Email"
2. Find "Confirm email" setting
3. Toggle it to **OFF** (disabled)
4. Click "Save"

**Note**: You can re-enable this later when you're ready to add email confirmation flows.

---

## Part 3: Test the Integration

### Step 1: Try Signing Up with Google
1. Open your application at `http://localhost:5173`
2. Click "Sign In" or "Get Started"
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. Select your Google account
6. Grant permissions
7. You should be redirected back to your app at `/dashboard`

### Step 2: Verify User Profile Creation
1. Go to your Supabase Dashboard
2. Navigate to "Authentication" > "Users"
3. You should see your new user listed
4. Navigate to "Table Editor" > "user_profiles"
5. You should see a corresponding profile record with your email and Google info

---

## Troubleshooting

### Issue: "Redirect URI Mismatch"
**Solution**: Make sure the redirect URI in Google Cloud Console exactly matches:
```
https://pfvpnltnzglbvnkbkius.supabase.co/auth/v1/callback
```

### Issue: "Connection Refused" or "Page Cannot Be Reached"
**Solution**:
1. Verify Google OAuth is enabled in Supabase Dashboard
2. Check that Client ID and Client Secret are correctly entered
3. Ensure the redirect URIs in Google Cloud match Supabase's callback URL

### Issue: User Signs In But No Profile Created
**Solution**: The database trigger should automatically create profiles. Check:
1. Migration `20251019130000_create_user_profiles` was applied successfully
2. The `handle_new_user()` function exists
3. The trigger `on_auth_user_created` is active on `auth.users`

### Issue: "Email Already Registered" Error
**Solution**: If you previously tried to sign up with the same email:
1. Go to Supabase Dashboard > Authentication > Users
2. Find and delete the test user
3. Try signing up again

---

## Email/Password Signup

Regular email/password signup should now work as well! The same trigger will automatically create user profiles for both OAuth and email/password signups.

### Test Email/Password Signup:
1. Open your application
2. Click "Sign In" > "Crear Cuenta" (Register)
3. Enter an email and password
4. Click "Crear Cuenta"
5. You should be logged in immediately (no email confirmation needed)
6. Check Supabase Dashboard to verify the user and profile were created

---

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console**:
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"

2. **Update Supabase Dashboard**:
   - Update Site URL to your production domain
   - Add production redirect URLs

3. **Enable Email Confirmation** (Optional):
   - Once your email sending is configured
   - Re-enable email confirmation in Supabase Dashboard
   - Update your app to handle email confirmation flows

---

## Security Best Practices

1. **Never commit credentials**: Keep your Google Client Secret secure
2. **Use environment variables**: Store sensitive config in `.env` files
3. **Enable email confirmation**: For production, enable email verification
4. **Monitor authentication**: Regularly check Supabase logs for suspicious activity
5. **Review OAuth scopes**: Only request the permissions you need

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## Support

If you encounter issues not covered in this guide:
1. Check Supabase Dashboard logs (Settings > Logs)
2. Check browser console for errors
3. Verify all URLs and credentials are correct
4. Consult Supabase documentation and support
