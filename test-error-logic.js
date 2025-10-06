// Test script to verify error handling logic
console.log('🧪 Testing PGRST204 error detection logic...');

// Simulate the error scenario
const mockError = {
  code: "PGRST204",
  message: "Could not find the 'address' column of 'profiles' in the schema cache",
  details: null,
  hint: null
};

// Test the detection logic we implemented
function detectMissingColumns(error) {
  if (error?.code === 'PGRST204' && error?.message?.includes("Could not find the 'address' column")) {
    console.log('✅ PGRST204 address column error detected correctly');
    return ['address', 'address_lat', 'address_lng'];
  }
  return [];
}

// Test with our mock error
const missingColumns = detectMissingColumns(mockError);
console.log('🔍 Missing columns detected:', missingColumns);

// Test payload filtering
const originalPayload = {
  full_name: 'Test User',
  address: '123 Main St',
  address_lat: 40.7128,
  address_lng: -74.0060,
  bio: 'Test bio'
};

function removeColumnsFromPayload(payload, columnsToRemove) {
  const filtered = { ...payload };
  columnsToRemove.forEach(col => {
    delete filtered[col];
  });
  return filtered;
}

const filteredPayload = removeColumnsFromPayload(originalPayload, missingColumns);
console.log('📦 Original payload keys:', Object.keys(originalPayload));
console.log('🔧 Filtered payload keys:', Object.keys(filteredPayload));

if (Object.keys(filteredPayload).length < Object.keys(originalPayload).length) {
  console.log('✅ Payload filtering works correctly');
} else {
  console.log('❌ Payload filtering failed');
}

console.log('🎉 Error handling test completed');
