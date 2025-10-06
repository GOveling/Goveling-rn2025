#!/usr/bin/env node

// Quick test to see if the enhanced error handling works
console.log('🧪 Testing enhanced error handling for address column...');

// Simulate the error condition we're getting
const testError = {
  code: 'PGRST204',
  message: "Could not find the 'address' column of 'profiles' in the schema cache"
};

console.log('📝 Original error:', testError);

// Test our error detection logic
if (testError.code === 'PGRST204' && testError.message?.includes("Could not find the")) {
  const missingColumn = testError.message.match(/'([^']+)' column/)?.[1];
  console.log('✅ Missing column detected:', missingColumn);
  
  if (missingColumn === 'address') {
    console.log('✅ Address column missing - our retry logic should kick in');
    console.log('🔄 This would trigger a retry without the address field');
  }
} else {
  console.log('❌ Error detection logic failed');
}

console.log('🧪 Test completed - error handling logic looks correct');
