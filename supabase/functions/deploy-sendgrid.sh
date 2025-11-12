#!/bin/bash

# SendGrid Migration Deployment Script
# This script deploys all updated functions for SendGrid integration

set -e

echo "🚀 Deploying SendGrid Email Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from your project root directory"
    exit 1
fi

echo "📦 Deploying functions..."

# Deploy all functions
supabase functions deploy send-email
supabase functions deploy sendgrid-webhook
supabase functions deploy inbound-email
supabase functions deploy link-redirect
supabase functions deploy send-scheduled-emails

echo "✅ All functions deployed successfully!"

echo ""
echo "🔧 Next steps:"
echo "1. Update your environment variables in Supabase dashboard:"
echo "   - SENDGRID_API_KEY"
echo "   - SENDGRID_DOMAIN"
echo "   - SENDGRID_DEFAULT_NAME"
echo "   - SENDGRID_WEBHOOK_VERIFY_KEY (optional)"
echo ""
echo "2. Configure SendGrid webhooks:"
echo "   - Event Webhook URL: https://your-project.supabase.co/functions/v1/sendgrid-webhook"
echo "   - Inbound Parse URL: https://your-project.supabase.co/functions/v1/inbound-email"
echo ""
echo "3. Run the database migration:"
echo "   supabase db push"
echo ""
echo "4. Test the integration with a sample email"
echo ""
echo "📖 See README_SENDGRID_MIGRATION.md for detailed setup instructions"