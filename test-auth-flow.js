
import fetch from 'node-fetch';

const TEST_USER = {
  email: 'greg@confluity.co.uk',
  password: 'confluity123'
};

async function testAuthFlow() {
  try {
    console.log('\n=== Starting Authentication Test ===\n');
    
    // Test DB connection first
    const healthCheck = await fetch('http://0.0.0.0:5000/api/auth/user');
    console.log('Health Check Status:', healthCheck.status);
    
    // Attempt login
    console.log('\nAttempting login with credentials:', {
      email: TEST_USER.email,
      passwordLength: TEST_USER.password.length
    });
    
    const loginResponse = await fetch('http://0.0.0.0:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
      credentials: 'include',
    });

    console.log('\nLogin Response:', {
      status: loginResponse.status,
      statusText: loginResponse.statusText,
      headers: Object.fromEntries(loginResponse.headers),
    });

    // Get response body
    const loginData = await loginResponse.json().catch(() => null);
    console.log('\nLogin Response Body:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed:', loginData?.message || 'Unknown error');
      return false;
    }

    // Test authenticated endpoint
    const authCheckResponse = await fetch('http://0.0.0.0:5000/api/auth/user', {
      credentials: 'include',
      headers: {
        Cookie: loginResponse.headers.get('set-cookie') || ''
      }
    });

    console.log('\nAuth Check Response:', {
      status: authCheckResponse.status,
      statusText: authCheckResponse.statusText,
      headers: Object.fromEntries(authCheckResponse.headers),
    });

    const authData = await authCheckResponse.json().catch(() => null);
    console.log('\nAuth Check Data:', authData);
    
    return loginResponse.ok && authCheckResponse.ok;
  } catch (error) {
    console.error('\nTest failed with error:', error);
    return false;
  }
}

// Run the test
testAuthFlow().then(success => {
  console.log('\n=== Test Complete ===');
  if (success) {
    console.log('✅ Authentication test passed!');
    process.exit(0);
  } else {
    console.log('❌ Authentication test failed!');
    process.exit(1);
  }
});
