/**
 * Test script for encrypt-document and decrypt-document Edge Functions
 */

const SUPABASE_URL = 'https://iwsuyrlrbmnbfyfkqowl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg';

// Test user token (you'll need to provide a valid user token)
const USER_TOKEN = process.env.USER_TOKEN || 'YOUR_USER_TOKEN_HERE';

async function testEncryption() {
  console.log('\n=== Testing encrypt-document Edge Function ===\n');

  const testData = {
    documentId: 'test-doc-' + Date.now(),
    title: 'Test Passport',
    documentType: 'passport',
    documentNumber: 'P123456789',
    issuingCountry: 'USA',
    issuingDate: '2020-01-01',
    expiryDate: '2030-01-01',
    notes: 'Test notes',
    imageUri: 'https://example.com/image.jpg',
    primaryKeyDerived: btoa('test-primary-key-256-bits-long-string-here-for-aes256'),
    recoveryKeyDerived: btoa('test-recovery-key-256-bits-long-string-here-for-aes256'),
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/encrypt-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${USER_TOKEN}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success && result.encryptedData) {
      console.log('\nEncryption successful!');
      console.log(
        '- Encrypted with primary:',
        result.encryptedData.encryptedWithPrimary.substring(0, 50) + '...'
      );
      console.log(
        '- Encrypted with recovery:',
        result.encryptedData.encryptedWithRecovery.substring(0, 50) + '...'
      );
      console.log('- Primary IV:', result.encryptedData.primaryIv);
      console.log('- Primary Auth Tag:', result.encryptedData.primaryAuthTag);

      return result.encryptedData;
    } else {
      console.error('\nEncryption failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('\nError calling encrypt-document:', error.message);
    return null;
  }
}

async function testDecryption(encryptedData, documentId) {
  console.log('\n=== Testing decrypt-document Edge Function ===\n');

  const testData = {
    documentId: documentId,
    encryptedData: encryptedData.encryptedWithPrimary,
    iv: encryptedData.primaryIv,
    authTag: encryptedData.primaryAuthTag,
    keyDerived: btoa('test-primary-key-256-bits-long-string-here-for-aes256'),
    useRecoveryKey: false,
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/decrypt-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${USER_TOKEN}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log('\nDecryption successful!');
      console.log('- Title:', result.data.title);
      console.log('- Document Number:', result.data.documentNumber);
      console.log('- Issuing Country:', result.data.issuingCountry);
    } else {
      console.error('\nDecryption failed:', result.error);
    }
  } catch (error) {
    console.error('\nError calling decrypt-document:', error.message);
  }
}

async function runTests() {
  console.log('Starting Edge Functions tests...');
  console.log('Project:', 'iwsuyrlrbmnbfyfkqowl');
  console.log('URL:', SUPABASE_URL);

  if (USER_TOKEN === 'YOUR_USER_TOKEN_HERE') {
    console.error('\nERROR: Please provide a valid USER_TOKEN');
    console.log(
      'You can get a token by logging in to the app and copying from the developer console'
    );
    process.exit(1);
  }

  // Test encryption
  const encryptedData = await testEncryption();

  if (encryptedData) {
    // Test decryption
    await testDecryption(encryptedData, 'test-doc-' + Date.now());
  }

  console.log('\n=== Tests completed ===\n');
}

runTests();
