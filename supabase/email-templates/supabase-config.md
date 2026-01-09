# Supabase Email Configuration for NexaSuit

## 1. Email Template Setup

### In Supabase Dashboard:

1. Go to **Authentication** > **Email Templates**
2. Select **Confirm signup** template
3. Replace the default template with the content from `confirm-email-simple.html`

### Template Subject:

```
Welcome to NexaSuit - Confirm Your Email
```

### Template Body:

Use the HTML content from `confirm-email-simple.html`

## 2. URL Configuration

### In Supabase Dashboard > Authentication > URL Configuration:

**Site URL:**

```
nexasuit://auth
```

**Redirect URLs (add all of these):**

```
nexasuit://auth/callback
nexasuit://auth/confirm
nexasuit://auth/reset-password
nexasuit://auth/invite
nexasuit://auth/magic-link
https://nexasuit.app/auth/callback
https://nexasuit.app/auth/confirm
http://localhost:3000/auth/callback
http://localhost:8081/auth/callback
```

## 3. Email Template Variables

The template uses these Supabase variables:

- `{{ .ConfirmationURL }}` - Auto-generated confirmation link
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your configured site URL

## 4. Deep Link Flow

### Email Confirmation Flow:

1. User signs up in app
2. Supabase sends email with link: `nexasuit://auth/confirm?token=...&type=signup`
3. User clicks link on mobile device
4. App opens to `/auth/confirm` route
5. Route extracts token and calls `supabase.auth.verifyOtp()`
6. On success, redirects to main app `/(tabs)/`

### Password Reset Flow:

1. User requests password reset
2. Supabase sends email with link: `nexasuit://auth/callback?token=...&type=recovery`
3. App opens to `/auth/callback` route
4. Route handles recovery flow and redirects to password reset form

## 5. Testing Deep Links

### Test URLs:

```bash
# Email confirmation
npx uri-scheme open nexasuit://auth/confirm?token=test&type=signup --ios
npx uri-scheme open nexasuit://auth/confirm?token=test&type=signup --android

# Auth callback
npx uri-scheme open nexasuit://auth/callback?token=test&type=recovery --ios
npx uri-scheme open nexasuit://auth/callback?token=test&type=recovery --android
```

### Verify in app.config.js:

```javascript
deepLinking: {
  enabled: true,
  prefixes: ['nexasuit://', 'https://nexasuit.app'],
  paths: {
    'auth/callback': 'auth/callback',
    'auth/confirm': 'auth/confirm',
    // ... other paths
  },
}
```

## 6. Production Setup

### For Production App:

1. **Update Site URL** to your production domain:

   ```
   https://nexasuit.app
   ```

2. **Add Production Redirect URLs**:

   ```
   https://nexasuit.app/auth/callback
   https://nexasuit.app/auth/confirm
   nexasuit://auth/callback
   nexasuit://auth/confirm
   ```

3. **Update Email Template** if needed to match production branding

## 7. Troubleshooting

### Common Issues:

**Deep link not opening app:**

- Verify `scheme: 'nexasuit'` in app.config.js
- Check that deep linking paths are correctly configured
- Test with `npx uri-scheme` commands

**Email confirmation failing:**

- Check Supabase logs for errors
- Verify token is being extracted correctly
- Ensure `verifyOtp` is called with correct parameters

**Redirect not working:**

- Verify redirect URLs are added to Supabase dashboard
- Check that URLs match exactly (case-sensitive)
- Test both mobile and web redirect URLs

### Debug Commands:

```bash
# Check if deep linking is working
npx uri-scheme list

# Test specific deep links
npx uri-scheme open nexasuit://auth/confirm?token=test --ios
```

## 8. Email Client Compatibility

The `confirm-email-simple.html` template is optimized for:

- ✅ Gmail (mobile & desktop)
- ✅ Outlook (mobile & desktop)
- ✅ Apple Mail (iOS & macOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Most mobile email clients

### Fallback for Unsupported Clients:

The template includes a plain text link as fallback for clients that don't support the button styling.
