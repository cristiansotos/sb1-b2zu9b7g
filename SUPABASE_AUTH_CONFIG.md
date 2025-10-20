# Supabase Authentication Configuration

## URLs to Configure in Supabase Dashboard

### Navigate to:
1. Go to https://supabase.com/dashboard
2. Select project: `pfvpnltnzglbvnkbkius`
3. Click **Authentication** in left sidebar
4. Click **URL Configuration**

### Site URL
Set **ONE** of these as your Site URL (choose based on your environment):

**For Local Development:**
```
http://localhost:5173
```

**For Production (when deployed):**
```
https://yourdomain.com
```

### Redirect URLs
Add **ALL** of these URLs to the Redirect URLs list:

**Local Development URLs:**
```
http://localhost:5173/**
http://localhost:5173/dashboard
http://localhost:5173/reset-password
```

**Production URLs (add when you deploy):**
```
https://yourdomain.com/**
https://yourdomain.com/dashboard
https://yourdomain.com/reset-password
```

**Important:** The `/**` wildcard pattern allows all paths under your domain.

## Common Issues and Solutions

### Issue 1: "Invalid Redirect URL" Error
**Cause:** The redirect URL you're using isn't in the allowed list.

**Solution:**
1. Make sure you added the wildcard pattern: `http://localhost:5173/**`
2. Save the configuration in Supabase Dashboard
3. Wait 30 seconds for changes to propagate
4. Clear browser cache and cookies
5. Try again

### Issue 2: Google OAuth Redirect Loop
**Cause:** Google Cloud Console redirect URIs don't match Supabase callback URL.

**Solution:**
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Edit your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", make sure you have EXACTLY:
   ```
   https://pfvpnltnzglbvnkbkius.supabase.co/auth/v1/callback
   ```
4. Save and try again

### Issue 3: "Session Not Found" After Login
**Cause:** Browser is blocking third-party cookies or session storage.

**Solution:**
1. Try in an incognito/private window
2. Check browser console for errors
3. Ensure `flowType: 'pkce'` is set in Supabase client config (already fixed)

### Issue 4: Email/Password Sign Up Not Working
**Cause:** Email confirmation might be enabled.

**Solution:**
1. Go to Authentication > Providers > Email
2. Scroll to "Confirm email" setting
3. Toggle it **OFF** for development
4. Save changes

## Testing Checklist

After configuration, test these flows:

- [ ] Email/password sign up
- [ ] Email/password login
- [ ] Google OAuth sign in
- [ ] Password reset email
- [ ] Redirect to `/dashboard` after login
- [ ] Session persists after page refresh

## Quick Debug Commands

### Check current session in browser console:
```javascript
const { data } = await supabase.auth.getSession();
console.log(data.session);
```

### Check for auth errors:
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
});
```

### Manually sign out:
```javascript
await supabase.auth.signOut();
```

## Current Configuration Status

- ✅ Supabase client configured with PKCE flow
- ✅ Auth store uses proper redirect URLs
- ⚠️ **ACTION REQUIRED:** Configure URLs in Supabase Dashboard (see above)

## What Port is Your Dev Server Using?

This configuration assumes your dev server runs on port **5173** (Vite default).

If you're using a different port, replace `5173` with your actual port number in all URLs above.

To check your port, look at the terminal when you run the dev server. It will show something like:
```
Local:   http://localhost:5173/
```
