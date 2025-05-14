
import fetch from 'node-fetch';

const TEST_USER = {
  email: 'greg@confluity.co.uk',
  password: 'confluity123'
};

async function testAuthFlow() {
  try {
    console.log("Starting authentication test with:", {
      email: TEST_USER.email,
      passwordLength: TEST_USER.password.length
    });
    
    // Test login
    const loginResponse = await fetch('http://0.0.0.0:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
      credentials: 'include',
    });

    console.log('Login Response Status:', loginResponse.status);
    const loginData = await loginResponse.json().catch(() => null);
    console.log('Login Response Data:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed:', loginData?.message || 'Unknown error');
      return false;
    }

    // Verify authentication with user check
    const userCheckResponse = await fetch('http://0.0.0.0:5000/api/auth/user', {
      credentials: 'include',
      headers: {
        Cookie: loginResponse.headers.get('set-cookie') || ''
      }
    });

    console.log('User Check Status:', userCheckResponse.status);
    const userData = await userCheckResponse.json().catch(() => null);
    console.log('User Data:', userData);
    
    return loginResponse.ok && userCheckResponse.ok;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
testAuthFlow().then(success => {
  if (success) {
    console.log('✅ Authentication test passed!');
    process.exit(0);
  } else {
    console.log('❌ Authentication test failed!');
    process.exit(1);
  }
});
