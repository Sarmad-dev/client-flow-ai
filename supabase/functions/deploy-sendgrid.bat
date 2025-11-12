@echo off
REM SendGrid Migration Deployment Script for Windows
REM This script deploys all updated functions for SendGrid integration

echo 🚀 Deploying SendGrid Email Functions...

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI is not installed. Please install it first:
    echo    npm install -g supabase
    exit /b 1
)

REM Check if we're in the right directory
if not exist "supabase\config.toml" (
    echo ❌ Please run this script from your project root directory
    exit /b 1
)

echo 📦 Deploying functions...

REM Deploy all functions
call supabase functions deploy send-email
if %errorlevel% neq 0 exit /b %errorlevel%

call supabase functions deploy sendgrid-webhook
if %errorlevel% neq 0 exit /b %errorlevel%

call supabase functions deploy inbound-email
if %errorlevel% neq 0 exit /b %errorlevel%

call supabase functions deploy link-redirect
if %errorlevel% neq 0 exit /b %errorlevel%

call supabase functions deploy send-scheduled-emails
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ All functions deployed successfully!
echo.
echo 🔧 Next steps:
echo 1. Update your environment variables in Supabase dashboard:
echo    - SENDGRID_API_KEY
echo    - SENDGRID_DOMAIN
echo    - SENDGRID_DEFAULT_NAME
echo    - SENDGRID_WEBHOOK_VERIFY_KEY (optional)
echo.
echo 2. Configure SendGrid webhooks:
echo    - Event Webhook URL: https://your-project.supabase.co/functions/v1/sendgrid-webhook
echo    - Inbound Parse URL: https://your-project.supabase.co/functions/v1/inbound-email
echo.
echo 3. Run the database migration:
echo    supabase db push
echo.
echo 4. Test the integration with a sample email
echo.
echo 📖 See README_SENDGRID_MIGRATION.md for detailed setup instructions