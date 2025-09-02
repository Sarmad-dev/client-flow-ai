# Google Calendar Integration Setup (Expo Auth Session)

## Prerequisites

1. **Google Cloud Console Setup**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Enable Google Sign-In API

2. **OAuth 2.0 Client IDs**:
   - Create Web Client ID (for React Native)
   - Create Android Client ID (for Android app)
   - Create iOS Client ID (for iOS app)

## Environment Variables

Add to your `.env` file:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_web_client_secret_here
```

## App Configuration

1. **app.json** - Ensure you have the correct scheme:

```json
{
  "expo": {
    "scheme": "clientflowai",
    "android": {
      "package": "com.sarmad_khan2694.clientflowai"
    },
    "ios": {
      "bundleIdentifier": "com.sarmad_khan2694.clientflowai"
    }
  }
}
```

## Dependencies

The following packages are already installed:

- `expo-auth-session`
- `expo-web-browser`
- `expo-crypto`

## Usage

The `useGoogleCalendar` hook provides:

- `isConnected`: Boolean indicating if user is signed in
- `connect()`: Function to initiate Google Sign-In
- `disconnect()`: Function to sign out
- `getAccessToken()`: Function to get access token for API calls
- `user`: Current user object
- `loading`: Loading state
- `error`: Error state

## Example

```tsx
const google = useGoogleCalendar();

// Check connection status
if (!google.isConnected) {
  return <Button onPress={google.connect} title="Connect Google Calendar" />;
}

// Get access token for API calls
const token = await google.getAccessToken();
```

## How it works

1. Uses Expo Auth Session for OAuth 2.0 flow
2. Opens Google Sign-In in a web browser
3. Handles token exchange and user info retrieval
4. Provides access token for Google Calendar API calls
5. Supports token revocation on disconnect

## Troubleshooting

- Ensure your OAuth client IDs are correctly configured
- Check that the redirect URI matches your app scheme
- Verify environment variables are properly set
- Make sure Google Calendar API is enabled in Google Cloud Console
