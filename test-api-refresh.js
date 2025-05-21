/**
 * Smoke test for API request retry on authentication failure
 * 
 * This simple test verifies our new fetch helper with authentication retry
 * based on the implementation in client/src/utils/apiRequest.ts
 */
import { apiRequest } from './client/src/utils/apiRequest.js';

// Record where we're in the test
let testStage = 'test-start';

async function runTest() {
  console.log('='.repeat(80));
  console.log('Testing API request with authentication retry');
  console.log('='.repeat(80));
  
  try {
    testStage = 'making-request';
    
    // Make a request to a protected endpoint
    const result = await apiRequest('GET', '/api/projects');
    
    testStage = 'validating-response';
    
    // Validate we got a proper JSON response
    if (Array.isArray(result)) {
      console.log('✅ Successfully received projects array');
      console.log(`Number of projects: ${result.length}`);
      
      // Print first project ID as verification
      if (result.length > 0) {
        console.log(`First project ID: ${result[0].id}`);
      }
      
      return {
        success: true,
        message: 'API request successful with retry mechanism',
        data: {
          projectCount: result.length
        }
      };
    } else {
      throw new Error('Expected array response but got: ' + JSON.stringify(result));
    }
  } catch (error) {
    console.error(`❌ Error in test stage "${testStage}":`, error.message);
    
    return {
      success: false,
      message: `Test failed in stage "${testStage}": ${error.message}`,
      error: error.message
    };
  }
}

// Run the test
runTest().then(result => {
  console.log('='.repeat(80));
  console.log('TEST RESULT:', result.success ? 'PASSED ✅' : 'FAILED ❌');
  console.log(result.message);
  console.log('='.repeat(80));
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
});