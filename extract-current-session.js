/**
 * Extract Current Browser Session
 * 
 * This script extracts the current browser session cookie and saves it to a file
 * for use with our test scripts.
 * 
 * Copy and paste this entire script into your browser console while logged in.
 */

(function() {
  // Get all cookies
  const cookies = document.cookie.split(';');
  
  // Find the session cookie (connect.sid)
  const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('connect.sid='));
  
  if (!sessionCookie) {
    console.error('No session cookie found. Please ensure you are logged in.');
    return;
  }
  
  // Format the cookie for fetch requests
  const formattedCookie = sessionCookie.trim();
  
  // Display the cookie
  console.log('Session cookie extracted:');
  console.log(formattedCookie);
  
  // Save to server via API
  fetch('/api/debug/save-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cookie: formattedCookie
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Session saved to file:', data);
    console.log('You can now run test scripts that require authentication!');
  })
  .catch(error => {
    console.error('Error saving session:', error);
  });
})();