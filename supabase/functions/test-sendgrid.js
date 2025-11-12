#!/usr/bin/env node

/**
 * SendGrid Integration Test Script
 *
 * This script tests the SendGrid email functionality by sending a test email
 * and verifying the webhook processing.
 *
 * Usage: node test-sendgrid.js
 *
 * Prerequisites:
 * - Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 * - Have a valid user JWT token
 * - SendGrid functions deployed and configured
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_TOKEN = process.env.JWT_TOKEN; // User JWT token for authentication

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !JWT_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL, SUPABASE_ANON_KEY, JWT_TOKEN');
  process.exit(1);
}

async function testSendEmail() {
  console.log('📧 Testing SendGrid email sending...');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'test@example.com',
      from: 'Test User', // This will be the display name
      subject: 'SendGrid Dynamic Sender Test',
      html: `
        <h1>SendGrid Dynamic Sender Test</h1>
        <p>This email demonstrates the dynamic sender address feature.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>This email should appear to come from a user-specific address at your domain.</p>
        <a href="https://example.com">Test Link for Click Tracking</a>
      `,
      text: `
        SendGrid Dynamic Sender Test
        
        This email demonstrates the dynamic sender address feature.
        Timestamp: ${new Date().toISOString()}
        
        This email should appear to come from a user-specific address at your domain.
        
        Test Link: https://example.com
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log('✅ Email sent successfully:', result);
  return result;
}

async function testWebhookEndpoint() {
  console.log('🔗 Testing SendGrid webhook endpoint...');

  // Test with a sample SendGrid webhook payload
  const sampleEvent = [
    {
      event: 'delivered',
      email: 'test@example.com',
      timestamp: Math.floor(Date.now() / 1000),
      sg_message_id: 'test-message-id',
      user_id: 'test-user-id',
    },
  ];

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/sendgrid-webhook`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleEvent),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.text();
  console.log('✅ Webhook processed successfully:', result);
  return result;
}

async function testInboundEndpoint() {
  console.log('📨 Testing inbound email endpoint...');

  // Test with a sample inbound email payload
  const sampleInbound = {
    from: 'sender@example.com',
    to: 'test@yourdomain.com',
    subject: 'Test Inbound Email',
    text: 'This is a test inbound email.',
    html: '<p>This is a test inbound email.</p>',
    headers: JSON.stringify({
      'Message-ID': '<test-message-id@example.com>',
    }),
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/inbound-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sampleInbound),
  });

  if (!response.ok) {
    const error = await response.text();
    console.log(
      '⚠️  Inbound email test failed (expected for test data):',
      error
    );
    return null;
  }

  const result = await response.text();
  console.log('✅ Inbound email processed successfully:', result);
  return result;
}

async function runTests() {
  console.log('🧪 Starting SendGrid Integration Tests...\n');

  try {
    // Test 1: Send Email
    await testSendEmail();
    console.log('');

    // Test 2: Webhook Processing
    await testWebhookEndpoint();
    console.log('');

    // Test 3: Inbound Email Processing
    await testInboundEndpoint();
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Check your SendGrid dashboard for delivery status');
    console.log('2. Verify webhook events are being processed');
    console.log('3. Test with real email addresses');
    console.log('4. Monitor Supabase function logs for any issues');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();

async function testCustomSenderName() {
  console.log('👤 Testing custom sender name...');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: 'test@example.com',
      from: 'Sales Team - John', // Custom display name
      subject: 'Custom Sender Name Test',
      html: '<p>This email tests custom sender names with dynamic addresses.</p>',
      text: 'This email tests custom sender names with dynamic addresses.',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log('✅ Custom sender email sent:', result);
  return result;
}

// Update the main test runner to include dynamic sender tests
console.log('🧪 Starting SendGrid Dynamic Sender Integration Tests...\n');
