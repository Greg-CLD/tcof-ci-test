
import fetch from 'node-fetch';

const TEST_USER = {
  email: 'greg@confluity.co.uk',
  password: 'confluity123'
};

async function testAuthFlow() {
  try {
    console.log("Testing authentication flow...");
    
    // Step 1: Test user creation/password reset
    const loginResponse = await fetch('http://0.0.0.0:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
      credentials: 'include',
    });

    console.log('Initial Login Attempt Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login Response:', loginData);

    // Step 2: Verify user exists
    const userCheckResponse = await fetch(`http://0.0.0.0:5000/api/auth/user`);
    console.log('User Check Status:', userCheckResponse.status);
    
    return loginResponse.ok;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testAuthFlow().then(success => {
  if (success) {
    console.log('Authentication test passed!');
    process.exit(0);
  } else {
    console.log('Authentication test failed!');
    process.exit(1);
  }
});
