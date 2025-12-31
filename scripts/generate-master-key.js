#!/usr/bin/env node

/**
 * Generate Master Key for Email Encryption
 *
 * This script generates a secure master key for server-side email encryption.
 * Run this once during initial setup and store the key securely.
 */

const crypto = require('crypto');

function generateMasterKey() {
  // Generate 32 random bytes (256 bits)
  const keyBytes = crypto.randomBytes(32);

  // Convert to base64 for easy storage
  const base64Key = keyBytes.toString('base64');

  return base64Key;
}

function main() {
  console.log('🔐 Generating Email Encryption Master Key...\n');

  const masterKey = generateMasterKey();

  console.log('✅ Master Key Generated Successfully!\n');
  console.log('📋 Copy this key to your environment variables:\n');
  console.log(`EMAIL_ENCRYPTION_MASTER_KEY=${masterKey}\n`);
  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   • Store this key securely (use a secrets manager)');
  console.log('   • Never commit this key to version control');
  console.log('   • Rotate this key periodically');
  console.log('   • Back up this key in a secure location');
  console.log('   • If lost, encrypted emails cannot be recovered\n');

  // Also show as .env format
  console.log('📄 For .env file:');
  console.log(`EMAIL_ENCRYPTION_MASTER_KEY="${masterKey}"`);
}

if (require.main === module) {
  main();
}

module.exports = { generateMasterKey };
