#!/bin/bash

# NexaSuit Supabase Deployment Script
# This script deploys database changes but NOT email templates
# Email templates must be configured manually via dashboard

set -e

echo "🚀 Deploying NexaSuit to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase first:"
    echo "supabase login"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "🔗 Project not linked. Please link your project first:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📊 Pushing database changes..."
supabase db push

echo "🌱 Running seed data..."
supabase db seed

echo "⚡ Deploying edge functions..."
if [ -d "supabase/functions" ]; then
    supabase functions deploy
else
    echo "No edge functions found, skipping..."
fi

echo "✅ Database deployment complete!"
echo ""
echo "📧 IMPORTANT: Email templates must be configured manually:"
echo "1. Run: supabase dashboard"
echo "2. Go to Authentication > Email Templates"
echo "3. Copy content from supabase/email-templates/confirm-email-simple.html"
echo "4. Configure URL settings in Authentication > URL Configuration"
echo ""
echo "📖 See scripts/setup-email-templates.md for detailed instructions"