# Email Templates Setup Guide

Since email templates cannot be deployed via Supabase CLI, follow these steps:

## Step 1: Deploy Configuration via CLI

```bash
# Make sure you're in your project root
cd /path/to/your/project

# Login to Supabase (if not already logged in)
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref your-project-ref

# Push database changes (migrations, functions, etc.)
supabase db push

# Deploy edge functions if you have any
supabase functions deploy

# Apply configuration changes
supabase start
```

## Step 2: Configure Email Templates via Dashboard

1. **Open Supabase Dashboard**

   ```bash
   # This will open your project dashboard
   supabase dashboard
   ```

2. **Navigate to Authentication > Email Templates**

3. **Configure Confirm Signup Template:**

   - Click on "Confirm signup"
   - Copy content from `supabase/email-templates/confirm-email-simple.html`
   - Paste into the template editor
   - Update subject line: "Welcome to NexaSuit - Confirm Your Email"
   - Save changes

4. **Configure Other Templates (Optional):**
   - Magic Link: For passwordless login
   - Reset Password: For password recovery
   - Invite User: For team invitations

## Step 3: Configure URL Settings

In **Authentication > URL Configuration**:

- **Site URL:** `nexasuit://auth`
- **Redirect URLs:** Add these URLs:
  ```
  nexasuit://auth/confirm
  nexasuit://auth/callback
  nexasuit://auth/reset-password
  https://yourdomain.com/auth/callback
  http://localhost:3000/auth/callback
  ```

## Step 4: Test Email Templates

```bash
# Start local development
supabase start

# Test email sending in your app
# Sign up a new user and check email delivery
```

## Step 5: Deploy to Production

```bash
# Deploy to production
supabase db push --linked

# Repeat email template configuration in production dashboard
```

## Troubleshooting

**Templates not updating?**

- Clear browser cache
- Check if you're in the correct project
- Verify you have admin permissions

**Emails not sending?**

- Check SMTP configuration in dashboard
- Verify email rate limits
- Check spam folder

**Deep links not working?**

- Verify app scheme configuration
- Test deep link handling in your app
- Check URL configuration in dashboard
