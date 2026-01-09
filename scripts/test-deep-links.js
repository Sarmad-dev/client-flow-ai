#!/usr/bin/env node

/**
 * Test script for NexaSuit deep linking
 * Run with: node scripts/test-deep-links.js
 */

const { execSync } = require('child_process');

const testLinks = [
  {
    name: 'Email Confirmation',
    url: 'nexasuit://auth/confirm?token=test123&type=signup',
    description: 'Tests email confirmation deep link',
  },
  {
    name: 'Auth Callback',
    url: 'nexasuit://auth/callback?token=test123&type=recovery',
    description: 'Tests general auth callback deep link',
  },
  {
    name: 'Project Detail',
    url: 'nexasuit://projects/123',
    description: 'Tests project detail deep link',
  },
  {
    name: 'Task Detail',
    url: 'nexasuit://tasks/456',
    description: 'Tests task detail deep link',
  },
  {
    name: 'Emails',
    url: 'nexasuit://emails',
    description: 'Tests emails section deep link',
  },
];

function testDeepLink(link, platform = 'ios') {
  try {
    console.log(`\n🔗 Testing: ${link.name}`);
    console.log(`📱 Platform: ${platform}`);
    console.log(`🌐 URL: ${link.url}`);
    console.log(`📝 Description: ${link.description}`);

    const command = `npx uri-scheme open "${link.url}" --${platform}`;
    console.log(`⚡ Command: ${command}`);

    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Successfully opened deep link`);
  } catch (error) {
    console.log(`❌ Failed to open deep link: ${error.message}`);
  }
}

function showAvailableSchemes() {
  try {
    console.log('\n📋 Available URI schemes:');
    execSync('npx uri-scheme list', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Could not list URI schemes:', error.message);
  }
}

function main() {
  const args = process.argv.slice(2);
  const platform = args.includes('--android') ? 'android' : 'ios';
  const testAll = args.includes('--all');
  const listOnly = args.includes('--list');

  console.log('🚀 NexaSuit Deep Link Tester');
  console.log('==============================');

  if (listOnly) {
    showAvailableSchemes();
    return;
  }

  if (testAll) {
    console.log(`\n🧪 Testing all deep links on ${platform}...`);
    testLinks.forEach((link) => {
      testDeepLink(link, platform);
      // Add delay between tests
      setTimeout(() => {}, 1000);
    });
  } else {
    console.log('\n📖 Available test links:');
    testLinks.forEach((link, index) => {
      console.log(`${index + 1}. ${link.name} - ${link.description}`);
    });

    console.log('\n🔧 Usage:');
    console.log(
      '  node scripts/test-deep-links.js --all          # Test all links (iOS)'
    );
    console.log(
      '  node scripts/test-deep-links.js --all --android # Test all links (Android)'
    );
    console.log(
      '  node scripts/test-deep-links.js --list         # List available schemes'
    );
    console.log(
      '\n💡 Make sure your app is installed and running in development mode'
    );
  }

  showAvailableSchemes();
}

if (require.main === module) {
  main();
}
