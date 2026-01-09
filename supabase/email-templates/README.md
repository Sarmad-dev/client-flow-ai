# NexaSuit Email Templates

This directory contains custom email templates for Supabase Auth in your NexaSuit CRM application.

## Setup Instructions

### 1. Configure in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Select **Confirm signup** template
4. Replace the default template with the content from `confirm-email.html`

### 2. Configure Redirect URLs

In your Supabase dashboard:

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to: `nexasuit://auth`
3. Add **Redirect URLs**:
   - `nexasuit://auth/confirm`
   - `nexasuit://auth/callback`
   - `https://yourdomain.com/auth/callback` (for web)
   - `http://localhost:3000/auth/callback` (for development)

### 3. Deep Link Configuration

The email template uses `nexasuit://auth/confirm` as the redirect URL. Make sure your React Native app is configured to handle this deep link.

#### In your `app.json`:

```json
{
  "expo": {
    "scheme": "nexasuit",
    "web": {
      "bundler": "metro"
    }
  }
}
```

#### Handle the deep link in your app:

```typescript
// In your auth callback handler
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';

export function useAuthCallback() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (url.includes('nexasuit://auth/confirm')) {
        // Extract token from URL and confirm
        const urlParams = new URL(url);
        const token = urlParams.searchParams.get('token');
        const type = urlParams.searchParams.get('type');

        if (token && type === 'signup') {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup',
          });

          if (!error) {
            // Redirect to main app
            router.replace('/(tabs)/');
          }
        }
      }
    };

    // Handle initial URL if app was opened from email
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, []);
}
```

### 4. Template Variables

The email template uses these Supabase variables:

- `{{ .ConfirmationURL }}` - The confirmation link with token
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your configured site URL

### 5. Customization

You can customize the template by:

- Updating colors in the CSS to match your brand
- Changing the logo and company information
- Modifying the messaging and copy
- Adding your social media links
- Updating the footer links

### 6. Testing

To test the email template:

1. Sign up a new user in your app
2. Check the email delivery
3. Click the confirmation link to ensure it redirects properly
4. Verify the user is confirmed in Supabase dashboard

## Template Features

✅ **Responsive Design** - Works on all devices and email clients
✅ **Brand Consistent** - Matches NexaSuit's green theme
✅ **Security Focused** - Clear messaging about security
✅ **Accessible** - Proper contrast and readable fonts
✅ **Professional** - Clean, modern design
✅ **Deep Link Ready** - Configured for mobile app redirects

## Troubleshooting

**Email not received?**

- Check spam/junk folder
- Verify SMTP configuration in Supabase
- Check rate limits

**Deep link not working?**

- Verify scheme is configured in app.json
- Check URL configuration in Supabase dashboard
- Test deep link handling in your app

**Styling issues?**

- Some email clients strip CSS, test with multiple clients
- Use inline styles for critical styling
- Test with Gmail, Outlook, Apple Mail

## Support

For issues with email templates or configuration, check:

- Supabase documentation on email templates
- React Native deep linking documentation
- Expo linking documentation
