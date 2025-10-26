# Resend SMTP Setup and Testing Guide

This guide walks you through setting up and testing Resend as your SMTP provider for both Supabase authentication emails and custom family invitation emails.

## Prerequisites

- ✅ Resend account created
- ✅ Domain `ethernalapp.com` verified in Resend
- ✅ Sending email `contacto@ethernalapp.com` configured
- ✅ Resend API key obtained
- ✅ Supabase project access

---

## Part 1: Verify Supabase SMTP Configuration

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `pfvpnltnzglbvnkbkius`
3. Navigate to **Authentication** in the left sidebar
4. Click on **Email Settings** or **Configuration**

### Step 2: Verify SMTP Settings

Confirm the following settings are configured:

```
Enable Custom SMTP: ✅ ON
SMTP Host: smtp.resend.com
SMTP Port: 465 (or 587 for TLS)
SMTP Username: resend
SMTP Password: [Your Resend API Key]
Sender Email: contacto@ethernalapp.com
Sender Name: Ethernal
```

### Step 3: Test SMTP Connection

1. In the SMTP Settings section, look for a "Test Configuration" button
2. Click it to send a test email
3. Check that the test email arrives from `contacto@ethernalapp.com`

**If test fails:**
- Verify your Resend API key is correct
- Ensure `contacto@ethernalapp.com` is verified in Resend
- Check SMTP port (try 587 if 465 doesn't work)
- Review Resend dashboard for any domain issues

---

## Part 2: Configure Authentication Email Templates

### Step 1: Navigate to Email Templates

1. In Supabase Dashboard, go to **Authentication > Email Templates**
2. You'll see templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

### Step 2: Apply Spanish Templates

For each template type, copy the corresponding template from `AUTHENTICATION_EMAIL_TEMPLATES.md`:

#### Confirm Signup Template
- Subject: `Confirma tu registro en Ethernal`
- Copy HTML from Section 1 in AUTHENTICATION_EMAIL_TEMPLATES.md
- Save template

#### Reset Password Template
- Subject: `Restablece tu contraseña de Ethernal`
- Copy HTML from Section 2 in AUTHENTICATION_EMAIL_TEMPLATES.md
- Save template

#### Magic Link Template
- Subject: `Tu enlace de acceso a Ethernal`
- Copy HTML from Section 3 in AUTHENTICATION_EMAIL_TEMPLATES.md
- Save template

#### Change Email Template
- Subject: `Confirma tu nuevo correo electrónico en Ethernal`
- Copy HTML from Section 4 in AUTHENTICATION_EMAIL_TEMPLATES.md
- Save template

### Step 3: Review URL Configuration

Ensure your Supabase Auth URLs are properly configured:

1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - `http://localhost:5173/**`
   - `http://localhost:5173/dashboard`
   - `https://yourdomain.com/**` (when in production)

---

## Part 3: Configure Edge Function Secrets

### Step 1: Access Edge Function Secrets

1. In Supabase Dashboard, go to **Edge Functions**
2. Click on **Manage secrets** or **Settings**

### Step 2: Add Required Secrets

Add the following secrets if not already present:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
APP_URL=http://localhost:5173 (or your production URL)
```

**Note:** The `OPENAI_API_KEY` should already be configured for transcription functionality.

### Step 3: Verify Family Invitation Function

The `send-family-invitation` Edge Function has been updated to use `contacto@ethernalapp.com`. No additional changes needed.

---

## Part 4: Testing Authentication Emails

### Test 1: Sign Up Flow

1. Open your app in incognito/private window
2. Click "Sign Up" or "Create Account"
3. Enter a test email address (use a real email you can access)
4. Enter a password and submit

**Expected Result:**
- Email arrives from `Ethernal <contacto@ethernalapp.com>`
- Subject: "Confirma tu registro en Ethernal"
- Email displays properly with Ethernal branding
- Confirmation button works and redirects to dashboard

**If email doesn't arrive:**
- Check spam/junk folder
- Verify SMTP configuration is correct
- Check Resend dashboard for delivery logs
- Ensure email confirmation is required in Auth settings

### Test 2: Password Reset Flow

1. On login page, click "Forgot Password"
2. Enter your email address
3. Submit the form

**Expected Result:**
- Email arrives from `Ethernal <contacto@ethernalapp.com>`
- Subject: "Restablece tu contraseña de Ethernal"
- Email displays properly with Ethernal branding
- Reset link works and allows password change

**If email doesn't arrive:**
- Check spam/junk folder
- Verify SMTP is enabled
- Check Resend logs for any errors

### Test 3: Magic Link (Optional)

If magic link authentication is enabled:

1. Try to sign in using magic link
2. Enter your email
3. Check for email arrival

**Expected Result:**
- Email arrives from `Ethernal <contacto@ethernalapp.com>`
- Subject: "Tu enlace de acceso a Ethernal"
- Magic link works for sign-in

### Test 4: Email Change

1. Log into your account
2. Go to Profile Settings
3. Change your email address
4. Check the new email inbox

**Expected Result:**
- Email arrives at new address from `Ethernal <contacto@ethernalapp.com>`
- Subject: "Confirma tu nuevo correo electrónico en Ethernal"
- Confirmation link works

---

## Part 5: Testing Family Invitation Emails

### Test 1: Send Family Invitation

1. Log into your app
2. Navigate to a family group or create one
3. Click "Invite Member"
4. Enter a test email address
5. Select a role (viewer, editor, or owner)
6. Submit the invitation

**Expected Result:**
- Email arrives from `Ethernal <contacto@ethernalapp.com>`
- Subject: "[Name] te ha invitado a [Family Name]"
- Email displays properly with invitation details
- Accept invitation button works

**If email doesn't arrive:**
- Check browser console for errors
- Check Supabase Edge Functions logs
- Verify `RESEND_API_KEY` is set in Edge Function secrets
- Check Resend dashboard for API errors

### Test 2: Accept Invitation

1. Click "Aceptar Invitación" button in email
2. If not logged in, create account or log in
3. Verify you're added to the family group

**Expected Result:**
- Invitation link works
- User is added to family group with correct role
- Can access family stories

---

## Part 6: Cross-Client Testing

Test email rendering across different email clients:

### Mobile Testing
- [ ] Gmail app (iOS)
- [ ] Gmail app (Android)
- [ ] Apple Mail (iOS)
- [ ] Outlook app

### Desktop Testing
- [ ] Gmail web
- [ ] Outlook web
- [ ] Apple Mail desktop
- [ ] Thunderbird

### Dark Mode Testing
- [ ] Test emails in dark mode on iOS
- [ ] Test emails in dark mode on Android
- [ ] Verify text remains readable

---

## Part 7: Deliverability Monitoring

### Check Email Deliverability

1. Log into Resend dashboard
2. Navigate to **Emails** section
3. Review recent sent emails
4. Check delivery status for each

**Key Metrics to Monitor:**
- Delivery rate (should be >95%)
- Bounce rate (should be <5%)
- Spam complaint rate (should be <0.1%)
- Open rate (varies, typically 20-40% for transactional)

### Monitor DNS Health

1. In Resend dashboard, go to **Domains**
2. Click on `ethernalapp.com`
3. Verify all DNS records are green/verified:
   - ✅ SPF record
   - ✅ DKIM record
   - ✅ DMARC record

**If any are not verified:**
- Check your DNS provider
- Verify records are properly configured
- Wait up to 48 hours for DNS propagation

---

## Troubleshooting Common Issues

### Emails Not Arriving

**Problem:** Test emails don't arrive in inbox

**Solutions:**
1. Check spam/junk folder first
2. Verify SMTP credentials are correct
3. Ensure sender domain is verified in Resend
4. Check Resend API logs for errors
5. Try sending to different email provider (Gmail, Outlook, etc.)

### Emails Look Broken

**Problem:** Email template doesn't render correctly

**Solutions:**
1. Verify HTML template was copied completely
2. Check for any template variable errors ({{ .ConfirmationURL }})
3. Test in different email clients
4. Use Resend's preview feature to debug
5. Check browser console for template errors

### Edge Function Fails

**Problem:** Family invitations fail to send

**Solutions:**
1. Check Edge Function logs in Supabase Dashboard
2. Verify `RESEND_API_KEY` is set correctly
3. Ensure `APP_URL` is configured
4. Test Edge Function directly using curl:

```bash
curl -X POST https://pfvpnltnzglbvnkbkius.supabase.co/functions/v1/send-family-invitation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"invitationId": "test-invitation-id"}'
```

### Wrong Sender Email

**Problem:** Emails come from wrong address

**Solutions:**
1. Verify SMTP sender email is `contacto@ethernalapp.com`
2. For family invitations, check Edge Function was updated
3. Clear any cached configurations
4. Redeploy Edge Functions if needed

---

## Final Checklist

Before going to production, ensure:

- [ ] SMTP configured with `contacto@ethernalapp.com`
- [ ] All 4 authentication email templates applied in Spanish
- [ ] Family invitation Edge Function updated
- [ ] `RESEND_API_KEY` set in Edge Function secrets
- [ ] All email flows tested and working
- [ ] Emails render correctly on mobile and desktop
- [ ] Emails land in inbox (not spam)
- [ ] DNS records verified in Resend
- [ ] Deliverability metrics looking good
- [ ] Production `APP_URL` configured when ready
- [ ] Site URL updated to production domain when deployed

---

## Support and Resources

- **Resend Documentation:** https://resend.com/docs
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Email Templates:** See `AUTHENTICATION_EMAIL_TEMPLATES.md`
- **Supabase SMTP Guide:** https://supabase.com/docs/guides/auth/auth-smtp

## Multi-Language Support (Future)

Currently, all templates are in Spanish. To add multi-language support:

1. Create separate templates for each language
2. Store user language preference in `user_profiles`
3. Use Supabase Auth hooks to route to correct template
4. Consider using user's browser locale as fallback

For now, Spanish templates provide a consistent experience for your initial user base.
