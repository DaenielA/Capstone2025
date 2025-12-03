#!/usr/bin/env node

/**
 * Client-side penalty test script
 * Run this to test penalties using your laptop's current date/time
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testPenalties() {
  console.log('🧪 Testing Credit Penalty System with Client Time');
  console.log('================================================\n');

  try {
    // Get current laptop time
    const now = new Date();
    console.log(`📅 Current laptop time: ${now.toLocaleString()}`);
    console.log(`🔗 ISO format: ${now.toISOString()}\n`);

    // Test penalty application
    console.log('🚀 Running penalty test...');
    const response = await fetch(`${API_BASE}/api/penalty/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testDate: now.toISOString(),
      }),
    });

    const result = await response.json();

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`✅ Success: ${result.success}`);
    console.log(`💬 Message: ${result.message}`);
    console.log(`🕒 Test Date: ${new Date(result.testDate).toLocaleString()}`);

    if (result.success) {
      console.log('\n🎉 Penalties applied successfully!');
      console.log('Check your member profile to see updated credit balances.');
    } else {
      console.log('\n❌ Test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error running test:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Your Next.js server is running (npm run dev)');
    console.log('   2. You have node-fetch installed (npm install node-fetch)');
    console.log('   3. Your laptop date/time is set to trigger penalties');
  }
}

// Run the test
testPenalties();
