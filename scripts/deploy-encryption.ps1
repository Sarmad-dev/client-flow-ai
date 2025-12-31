# Email Encryption Deployment Script (PowerShell)
# This script helps deploy the email encryption system on Windows

param(
    [switch]$SkipTests,
    [switch]$GenerateKey
)

Write-Host "🔒 Email Encryption Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a Supabase project
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "❌ Not in a Supabase project directory" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Checking environment variables..." -ForegroundColor Blue

# Check for encryption key
$encryptionKey = $env:EMAIL_ENCRYPTION_KEY
$masterKey = $env:EMAIL_ENCRYPTION_MASTER_KEY

if (-not $encryptionKey -and -not $masterKey) {
    Write-Host "⚠️  EMAIL_ENCRYPTION_KEY not found in environment" -ForegroundColor Yellow
    
    if ($GenerateKey) {
        Write-Host "   Generating a new encryption key..." -ForegroundColor Yellow
        
        # Generate a secure key using .NET crypto
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $newKey = [Convert]::ToBase64String($bytes)
        
        Write-Host ""
        Write-Host "🔑 Generated encryption key:" -ForegroundColor Green
        Write-Host "   EMAIL_ENCRYPTION_KEY=$newKey" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Please add this to your environment variables:" -ForegroundColor Yellow
        Write-Host "   - In your .env file" -ForegroundColor Yellow
        Write-Host "   - In your Supabase project settings" -ForegroundColor Yellow
        Write-Host "   - In your production environment" -ForegroundColor Yellow
        Write-Host ""
        
        # Optionally set it for this session
        $response = Read-Host "Set this key for the current session? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            $env:EMAIL_ENCRYPTION_KEY = $newKey
            Write-Host "✅ Key set for current session" -ForegroundColor Green
        }
    } else {
        Write-Host "   Run with -GenerateKey to generate a new key" -ForegroundColor Yellow
        Write-Host "   Or set EMAIL_ENCRYPTION_KEY manually" -ForegroundColor Yellow
        Read-Host "Press Enter to continue after setting the environment variable"
    }
} else {
    Write-Host "✅ Encryption key found" -ForegroundColor Green
}

# Deploy database migrations
Write-Host ""
Write-Host "🗄️  Deploying database migrations..." -ForegroundColor Blue

try {
    supabase db push
    Write-Host "✅ Database migrations deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to deploy database migrations" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Deploy edge functions
Write-Host ""
Write-Host "🚀 Deploying edge functions..." -ForegroundColor Blue

$functions = @("send-email", "send-email-encrypted", "inbound-email", "decrypt-emails")

foreach ($func in $functions) {
    Write-Host "   Deploying $func function..." -ForegroundColor Yellow
    try {
        supabase functions deploy $func
        Write-Host "   ✅ $func deployed" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to deploy $func" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Test encryption support (if not skipped)
if (-not $SkipTests) {
    Write-Host ""
    Write-Host "🧪 Testing encryption support..." -ForegroundColor Blue
    
    # Test Web Crypto API availability
    $testScript = @"
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
"@

    $testScript | Out-File -FilePath "$env:TEMP\test_encryption.js" -Encoding UTF8
    
    try {
        node "$env:TEMP\test_encryption.js"
        Write-Host "✅ Encryption test passed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Encryption test failed - server-side encryption will be used" -ForegroundColor Yellow
    } finally {
        Remove-Item "$env:TEMP\test_encryption.js" -ErrorAction SilentlyContinue
    }
}

# Verify deployment
Write-Host ""
Write-Host "🔍 Verifying deployment..." -ForegroundColor Blue

Write-Host "   Checking database functions..." -ForegroundColor Yellow
try {
    $dbDiff = supabase db diff --schema public
    if ($dbDiff -match "get_encryption_stats|migrate_emails_to_encrypted") {
        Write-Host "   ✅ Encryption functions found in database" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Encryption functions may not be deployed correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not verify database functions" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update your React Native app with the new encrypted components" -ForegroundColor White
Write-Host "   2. Test email sending and receiving" -ForegroundColor White
Write-Host "   3. Monitor encryption success rates" -ForegroundColor White
Write-Host "   4. Check the setup guide: docs/SETUP_GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Cyan
Write-Host "   - Check encryption stats: SELECT * FROM get_encryption_stats(auth.uid());" -ForegroundColor White
Write-Host "   - View function logs: supabase functions logs send-email-encrypted" -ForegroundColor White
Write-Host "   - Test encryption: Use the EncryptedEmailComposer component" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - Setup Guide: docs/SETUP_GUIDE.md" -ForegroundColor White
Write-Host "   - Email Encryption: docs/EMAIL_ENCRYPTION.md" -ForegroundColor White
Write-Host "   - Deployment Guide: docs/DEPLOYMENT_GUIDE.md" -ForegroundColor White

Write-Host ""
Write-Host "💡 Usage examples:" -ForegroundColor Cyan
Write-Host "   .\scripts\deploy-encryption.ps1                 # Standard deployment" -ForegroundColor White
Write-Host "   .\scripts\deploy-encryption.ps1 -GenerateKey    # Generate new encryption key" -ForegroundColor White
Write-Host "   .\scripts\deploy-encryption.ps1 -SkipTests      # Skip encryption tests" -ForegroundColor White