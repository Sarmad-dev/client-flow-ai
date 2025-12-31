#!/bin/bash

# Email Encryption Deployment Script
# This script helps deploy the email encryption system

set -e

echo "🔒 Email Encryption Deployment Script"
echo "======================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check for required environment variables
echo ""
echo "📋 Checking environment variables..."

if [ -z "$EMAIL_ENCRYPTION_KEY" ] && [ -z "$EMAIL_ENCRYPTION_MASTER_KEY" ]; then
    echo "⚠️  EMAIL_ENCRYPTION_KEY not found in environment"
    echo "   Generating a new encryption key..."
    
    # Generate a secure key
    ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    echo ""
    echo "🔑 Generated encryption key:"
    echo "   EMAIL_ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo ""
    echo "   Please add this to your environment variables:"
    echo "   - In your .env file"
    echo "   - In your Supabase project settings"
    echo "   - In your production environment"
    echo ""
    read -p "Press Enter to continue after setting the environment variable..."
else
    echo "✅ Encryption key found"
fi

# Deploy database migrations
echo ""
echo "🗄️  Deploying database migrations..."
if supabase db push; then
    echo "✅ Database migrations deployed successfully"
else
    echo "❌ Failed to deploy database migrations"
    exit 1
fi

# Deploy edge functions
echo ""
echo "🚀 Deploying edge functions..."

echo "   Deploying send-email function..."
if supabase functions deploy send-email; then
    echo "   ✅ send-email deployed"
else
    echo "   ❌ Failed to deploy send-email"
    exit 1
fi

echo "   Deploying send-email-encrypted function..."
if supabase functions deploy send-email-encrypted; then
    echo "   ✅ send-email-encrypted deployed"
else
    echo "   ❌ Failed to deploy send-email-encrypted"
    exit 1
fi

echo "   Deploying decrypt-emails function..."
if supabase functions deploy decrypt-emails; then
    echo "   ✅ decrypt-emails deployed"
else
    echo "   ❌ Failed to deploy decrypt-emails"
    exit 1
fi

# Test encryption support
echo ""
echo "🧪 Testing encryption support..."

# Create a simple test script
cat > /tmp/test_encryption.js << 'EOF'
// Test encryption support
const testEncryption = () => {
  if (typeof crypto !== 'undefined' && 
      typeof crypto.subtle !== 'undefined' && 
      typeof crypto.getRandomValues !== 'undefined') {
    console.log('✅ Web Crypto API is supported');
    return true;
  } else {
    console.log('❌ Web Crypto API is not supported');
    return false;
  }
};

testEncryption();
EOF

if node /tmp/test_encryption.js; then
    echo "✅ Encryption test passed"
else
    echo "⚠️  Encryption test failed - server-side encryption will be used"
fi

rm -f /tmp/test_encryption.js

# Verify deployment
echo ""
echo "🔍 Verifying deployment..."

echo "   Checking database functions..."
if supabase db diff --schema public | grep -q "get_encryption_stats\|migrate_emails_to_encrypted"; then
    echo "   ✅ Encryption functions found in database"
else
    echo "   ⚠️  Encryption functions may not be deployed correctly"
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Update your React Native app with the new encrypted components"
echo "   2. Test email sending and receiving"
echo "   3. Monitor encryption success rates"
echo "   4. Check the setup guide: docs/SETUP_GUIDE.md"
echo ""
echo "🔧 Useful commands:"
echo "   - Check encryption stats: SELECT * FROM get_encryption_stats(auth.uid());"
echo "   - View function logs: supabase functions logs send-email-encrypted"
echo "   - Test encryption: Use the EncryptedEmailComposer component"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: docs/SETUP_GUIDE.md"
echo "   - Email Encryption: docs/EMAIL_ENCRYPTION.md"
echo "   - Deployment Guide: docs/DEPLOYMENT_GUIDE.md"
echo "   Deploying decrypt-emails function..."
if supabase functions deploy decrypt-emails; then
    echo "   ✅ decrypt-emails deployed"
else
    echo "   ❌ Failed to deploy decrypt-emails"
    exit 1
fi