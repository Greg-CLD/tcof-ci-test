/**
 * Session Cookie Extractor for the browser
 * 
 * Instructions:
 * 1. Make sure you're logged in to the application in your browser
 * 2. Open the browser's dev tools console (F12)
 * 3. Paste and run this entire script
 * 4. The cookie will be saved to cookies.txt for direct API usage in tests
 */

// Extract cookie from document.cookie
function extractSessionCookie() {
  const cookieString = document.cookie;
  console.log('Current cookies:', cookieString);
  
  if (!cookieString) {
    console.error('No cookies found in current session');
    return null;
  }
  
  return cookieString;
}

// This function will run in the browser
function runBrowserScript() {
  const cookie = extractSessionCookie();
  
  if (cookie) {
    console.log('Session cookie found:', cookie);
    console.log('Copy this cookie string to your cookies.txt file');
    
    // Display in a more visible format for copying
    const outputDiv = document.createElement('div');
    outputDiv.style.position = 'fixed';
    outputDiv.style.top = '0';
    outputDiv.style.left = '0';
    outputDiv.style.right = '0';
    outputDiv.style.padding = '20px';
    outputDiv.style.backgroundColor = '#f0f0f0';
    outputDiv.style.borderBottom = '1px solid #ccc';
    outputDiv.style.zIndex = '10000';
    outputDiv.style.fontFamily = 'monospace';
    outputDiv.style.whiteSpace = 'pre-wrap';
    outputDiv.style.wordBreak = 'break-all';
    
    outputDiv.innerHTML = `
      <h3>Session Cookie for API Testing</h3>
      <p>Copy this cookie string to your cookies.txt file:</p>
      <textarea rows="3" style="width: 100%; margin-top: 10px; padding: 5px;">${cookie}</textarea>
      <button id="copyCookie" style="margin-top: 10px; padding: 5px 10px;">Copy to Clipboard</button>
      <span id="copyStatus" style="margin-left: 10px;"></span>
    `;
    
    document.body.appendChild(outputDiv);
    
    // Add copy functionality
    document.getElementById('copyCookie').addEventListener('click', () => {
      const textarea = outputDiv.querySelector('textarea');
      textarea.select();
      document.execCommand('copy');
      document.getElementById('copyStatus').textContent = 'Copied!';
      
      setTimeout(() => {
        document.getElementById('copyStatus').textContent = '';
      }, 2000);
    });
  }
}

// Print instructions for manual testing
console.log(`
===== Session Cookie Extraction Script =====

This script extracts the current browser session cookie
for use with manual API testing scripts.

Instructions:
1. Log in to the application in your browser
2. Run this script in the browser console (F12 > Console)
3. Copy the displayed cookie string
4. Save it to 'cookies.txt' in the project root
5. Run your API tests that use this cookie for authentication

Browser console script:
${runBrowserScript.toString()}

To run in browser console, paste this:
(${runBrowserScript.toString()})();
`);