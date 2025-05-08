// Simple script to test authentication endpoints

import fetch from 'node-fetch';

async function testAuth() {
  try {
    console.log("Testing /api/auth/user endpoint...");
    
    // Test without authentication (should return 401)
    const unauthenticatedResponse = await fetch('http://localhost:5000/api/auth/user');
    console.log("Status:", unauthenticatedResponse.status);
    if (unauthenticatedResponse.status === 401) {
      console.log("✅ Authentication check works - unauthenticated request returns 401");
    } else {
      console.log("❌ Authentication check failed - unauthenticated request should return 401 but got:", unauthenticatedResponse.status);
    }
    
    // Test login redirect
    const loginRedirectResponse = await fetch('http://localhost:5000/api/login', { redirect: 'manual' });
    console.log("Login status:", loginRedirectResponse.status);
    
    if (loginRedirectResponse.status >= 300 && loginRedirectResponse.status < 400) {
      console.log("✅ Login endpoint redirects to Replit Auth as expected");
    } else {
      console.log("❌ Login endpoint should redirect but got status:", loginRedirectResponse.status);
    }
    
    console.log("\nAuthentication endpoints test complete!");
    console.log("Note: To fully test login flow, use the application in the browser.");
  } catch (error) {
    console.error("Error testing auth endpoints:", error);
  }
}

testAuth();