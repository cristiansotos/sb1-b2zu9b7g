# APP_URL Configuration Guide

This guide explains how to configure the `APP_URL` environment variable for Supabase Edge Functions.

## What is APP_URL?

The `APP_URL` environment variable is used by Edge Functions (specifically the `send-family-invitation` function) to generate correct invitation links. It should point to your application's base URL.

## When to Configure

You need to configure this environment variable when:
- Setting up the application for the first time
- Switching between development and production environments
- Changing your application's domain

## Step-by-Step Configuration

### Method 1: Using Supabase Dashboard (Recommended)

1. **Log into Supabase Dashboard**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign in with your credentials
   - Select your project from the project list

2. **Navigate to Edge Functions**
   - In the left sidebar, click on **"Edge Functions"**
   - You should see a list of your deployed functions

3. **Open Secrets Management**
   - Click the **"Manage secrets"** button in the top-right corner of the Edge Functions page
   - This will open the secrets management interface

4. **Add the APP_URL Secret**
   - Click the **"Add new secret"** button
   - In the "Name" field, enter: `APP_URL`
   - In the "Value" field, enter one of the following:
     - For **development**: `http://localhost:5173`
     - For **production**: `https://www.ethernalapp.com` (or your production domain)

5. **Save the Secret**
   - Click **"Save"** or **"Add secret"** to save your configuration
   - The secret is now available to all Edge Functions

6. **Redeploy Edge Functions (Important!)**
   - After adding or updating environment variables, you need to redeploy your Edge Functions
   - Go to **Edge Functions** in the left sidebar
   - For each function that uses `APP_URL` (especially `send-family-invitation`):
     - Click on the function name
     - Click the **"Deploy"** button
     - Confirm the deployment

### Method 2: Using Supabase CLI

If you're using the Supabase CLI for deployment, you can set secrets using the command line:

```bash
# Set the secret
supabase secrets set APP_URL=http://localhost:5173

# List all secrets to verify
supabase secrets list

# Deploy your functions to use the new secret
supabase functions deploy send-family-invitation
```

## Environment-Specific Values

### Development Environment
```
APP_URL=http://localhost:5173
```

### Staging Environment (if applicable)
```
APP_URL=https://staging.ethernalapp.com
```

### Production Environment
```
APP_URL=https://www.ethernalapp.com
```

## Verification

After configuring the `APP_URL`, verify it's working correctly:

1. **Test Family Invitations**
   - Try sending a family invitation from your application
   - Check the email received
   - Verify the invitation link contains the correct domain

2. **Check Edge Function Logs**
   - Go to **Edge Functions** → Select function → **Logs**
   - Look for any errors related to `APP_URL`
   - Successful invitations should show the correct URL in logs

## Troubleshooting

### Issue: Invitation emails have incorrect URLs

**Solution:**
- Verify `APP_URL` is set correctly in Supabase secrets
- Make sure you redeployed the `send-family-invitation` function after setting the secret
- Check for typos in the URL (common mistakes: trailing slash, http vs https)

### Issue: APP_URL changes not taking effect

**Solution:**
- Edge Functions cache environment variables
- You must redeploy the function after changing secrets
- Clear your browser cache if testing the invitation flow

### Issue: Cannot find "Manage secrets" button

**Solution:**
- Ensure you're in the **Edge Functions** section (not Database or Storage)
- You need appropriate permissions (owner or admin role) to manage secrets
- Try refreshing the page or logging out and back in

### Issue: Getting "APP_URL is not defined" errors

**Solution:**
- Confirm the secret name is exactly `APP_URL` (case-sensitive)
- Redeploy all Edge Functions that use this variable
- Wait a few seconds after deployment for changes to propagate

## Security Notes

- Never commit `APP_URL` values to your Git repository
- Keep development and production URLs separate
- Use HTTPS for production environments
- Avoid exposing internal or localhost URLs in production

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Environment Variables Best Practices](https://supabase.com/docs/guides/functions/environment-variables)

## Summary Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Navigated to Edge Functions → Manage secrets
- [ ] Added `APP_URL` secret with correct value
- [ ] Saved the secret
- [ ] Redeployed `send-family-invitation` Edge Function
- [ ] Tested family invitation flow
- [ ] Verified invitation email contains correct URL
- [ ] Documented the URL for your team/future reference

---

**Last Updated:** 2025-10-26
**Related Files:** `supabase/functions/send-family-invitation/index.ts`
