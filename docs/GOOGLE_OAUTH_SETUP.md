# Google OAuth Setup Guide

## Overview

NexaSuit now supports Google Sign-In using Supabase OAuth. This allows users to sign in with their Google account instead of creating a new password.

## What Was Implemented

### 1. ✅ Enhanced AuthContext

- Updated `signInWithGoogle()` method to properly handle OAuth flow
- Added proper error handling and browser session management
- Integrated with Expo WebBrowser for OAuth flow

### 2. ✅ OAuth Callback Handler

- Created `app/auth/callback.tsx` to handle OAuth redirects
- Exchanges authorization code for session
- Redirects to appropriate screen after authentication

### 3. ✅ UI Integration

- Google Sign-In button in `sign-in.tsx`
- Google Sign-Up button in `sign-up.tsx`
- Proper loading states and error handling

## Setup Instructions

### Step 1: Configure Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Create or Select a Project**

   - Click "Select a project" → "New Project"
   - Name it "NexaSuit" or similar
   - Click "Create"

3. **Enable Google+ API**

   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**

   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: NexaSuit
     - User support email: your email
     - Developer contact: your email
     - Add scopes: email, profile, openid
     - Add test users if in testing mode

5. **Create OAuth Client IDs**

   **For Web (Supabase):**

   - Application type: Web application
   - Name: NexaSuit Web
   - Authorized JavaScript origins:
     - `https://your-project.supabase.co`
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
   - Click "Create"
   - **Save the Client ID and Client Secret**

   **For Android:**

   - Application type: Android
   - Name: NexaSuit Android
   - Package name: `com.sarmadkhan2694.nexasuit`
   - SHA-1 certificate fingerprint:

     ```bash
     # Debug keystore
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

     # Production keystore
     keytool -list -v -keystore /path/to/your/keystore -alias your-alias
     ```

   - Click "Create"

   **For iOS:**

   - Application type: iOS
   - Name: NexaSuit iOS
   - Bundle ID: `com.yourcompany.nexasuit`
   - Click "Create"

### Step 2: Configure Supabase

1. **Go to [Supabase Dashboard](https://app.supabase.com/)**

2. **Navigate to Authentication → Providers**

3. **Enable Google Provider**

   - Toggle "Google" to enabled
   - Enter the **Client ID** from Google Cloud Console (Web application)
   - Enter the **Client Secret** from Google Cloud Console (Web application)
   - Click "Save"

4. **Configure Redirect URLs**
   - Go to Authentication → URL Configuration
   - Add redirect URLs:
     - `nexasuit://auth/callback`
     - `https://nexasuit.app/auth/callback` (if you have a web domain)
   - Add to Site URL: `nexasuit://`

### Step 3: Update Environment Variables

Add to your `.env` file:

```bash
# Supabase (already configured)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth (already in app.json)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Step 4: Configure app.json

Your `app.json` already has the correct configuration:

```json
{
  "expo": {
    "scheme": "nexasuit",
    "deepLinking": {
      "enabled": true,
      "prefixes": ["nexasuit://", "https://nexasuit.app"]
    }
  }
}
```

### Step 5: Test the Implementation

#### On Development

```bash
# Start the development server
npm run dev

# Run on Android
npm run android

# Run on iOS
npm run ios
```

#### Testing Flow

1. Open the app
2. Navigate to Sign In screen
3. Click "Continue with Google"
4. Browser opens with Google sign-in
5. Select Google account
6. Grant permissions
7. Browser redirects back to app
8. User is signed in

## How It Works

### OAuth Flow Diagram

```
┌─────────────┐
│   User      │
│  Clicks     │
│  "Google"   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  AuthContext.signInWithGoogle()    │
│  - Creates redirect URL             │
│  - Calls Supabase OAuth             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Supabase Auth                      │
│  - Generates OAuth URL              │
│  - Returns authorization URL        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  WebBrowser.openAuthSessionAsync() │
│  - Opens Google sign-in page        │
│  - User authenticates               │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Google OAuth                       │
│  - User grants permissions          │
│  - Redirects to callback URL        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Deep Link Handler                  │
│  - Catches nexasuit://auth/callback │
│  - Extracts authorization code      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  app/auth/callback.tsx              │
│  - Exchanges code for session       │
│  - Saves session                    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Redirect to Main App               │
│  - User is authenticated            │
│  - Session stored                   │
└─────────────────────────────────────┘
```

### Code Flow

1. **User clicks "Continue with Google"**

   ```typescript
   const handleGoogleSignIn = async () => {
     const { error } = await signInWithGoogle();
     if (error) {
       // Show error
     }
   };
   ```

2. **AuthContext initiates OAuth**

   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: 'nexasuit://auth/callback',
     },
   });
   ```

3. **Browser opens for authentication**

   ```typescript
   await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
   ```

4. **Callback handler processes response**

   ```typescript
   const { data } = await supabase.auth.exchangeCodeForSession(url);
   ```

5. **User is redirected to main app**
   ```typescript
   router.replace('/(tabs)');
   ```

## Features

### ✅ Implemented

- Google Sign-In on login screen
- Google Sign-Up on registration screen
- Automatic session management
- Deep link handling
- Error handling
- Loading states
- Proper redirect flow

### 🎯 Benefits

- **No password required**: Users can sign in with existing Google account
- **Faster onboarding**: One-click sign-up
- **Better security**: OAuth 2.0 standard
- **Auto-fill**: Google account picker
- **Cross-device**: Works on iOS, Android, and Web

## Troubleshooting

### Issue: "redirect_uri_mismatch"

**Solution**:

1. Check that redirect URI in Google Cloud Console matches exactly
2. Ensure Supabase callback URL is added: `https://your-project.supabase.co/auth/v1/callback`
3. Verify deep link scheme in app.json: `nexasuit://`

### Issue: "invalid_client"

**Solution**:

1. Verify Client ID and Client Secret in Supabase dashboard
2. Ensure Google+ API is enabled
3. Check that OAuth consent screen is configured

### Issue: Browser doesn't redirect back to app

**Solution**:

1. Verify `scheme` in app.json: `"scheme": "nexasuit"`
2. Check deep linking configuration
3. Ensure `WebBrowser.maybeCompleteAuthSession()` is called
4. Test with `npx uri-scheme open nexasuit://auth/callback --android` or `--ios`

### Issue: "Session not found"

**Solution**:

1. Check that callback handler is properly exchanging code
2. Verify Supabase URL and anon key are correct
3. Check network connectivity
4. Look for errors in console logs

### Issue: Works on one platform but not another

**Solution**:

1. Ensure OAuth client is created for each platform (Web, Android, iOS)
2. Verify package name (Android) and bundle ID (iOS) match
3. Check SHA-1 fingerprint for Android
4. Test deep linking: `npx uri-scheme list`

## Testing Checklist

- [ ] Google Sign-In button appears on login screen
- [ ] Clicking button opens Google sign-in page
- [ ] Can select Google account
- [ ] Can grant permissions
- [ ] Browser redirects back to app
- [ ] User is signed in successfully
- [ ] Session persists after app restart
- [ ] Can sign out and sign in again
- [ ] Error messages display correctly
- [ ] Loading states work properly
- [ ] Works on Android
- [ ] Works on iOS
- [ ] Works on Web (if applicable)

## Security Considerations

### ✅ Implemented

- PKCE flow for secure authorization
- Secure token storage in AsyncStorage
- Session expiration handling
- Proper error handling
- No client secrets in mobile app

### 🔒 Best Practices

1. **Never expose client secrets** in mobile apps
2. **Use PKCE** for mobile OAuth flows
3. **Validate redirect URIs** in Google Cloud Console
4. **Enable only necessary scopes**
5. **Implement session timeout**
6. **Handle token refresh** properly
7. **Log security events**

## Additional Scopes

If you need additional Google services (Calendar, Drive, etc.), add scopes:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
      scope: 'openid email profile https://www.googleapis.com/auth/calendar',
    },
  },
});
```

## Production Deployment

### Before Publishing

1. **Update OAuth Consent Screen**

   - Change from "Testing" to "Production"
   - Add privacy policy URL
   - Add terms of service URL
   - Submit for verification if needed

2. **Update Redirect URIs**

   - Add production URLs
   - Remove development URLs
   - Update Supabase configuration

3. **Generate Production Keys**

   - Create production keystore (Android)
   - Get production SHA-1 fingerprint
   - Update Google Cloud Console

4. **Test Production Build**
   - Build production APK/IPA
   - Test OAuth flow
   - Verify deep linking works

## Support

For issues or questions:

- Supabase Docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- Expo Auth Session: https://docs.expo.dev/versions/latest/sdk/auth-session/

---

**Status**: ✅ IMPLEMENTED
**Last Updated**: December 8, 2025
**Version**: 1.0
