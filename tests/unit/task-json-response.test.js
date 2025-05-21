/**
 * Unit test to verify PUT /api/projects/:projectId/tasks/:taskId always returns JSON
 * 
 * This test ensures that the task update endpoint always returns proper JSON
 * responses instead of falling through to SPA fallbacks with HTML.
 */

import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Test constants
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const NON_EXISTENT_TASK_ID = crypto.randomUUID();
const VALID_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-success-factor';
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Helper function to extract cookies from response headers
function getCookiesFromResponse(response) {
  const cookies = {};
  const cookieHeader = response.headers.get('set-cookie');
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });
  }
  
  return cookies;
}

describe('PUT /api/projects/:projectId/tasks/:taskId', () => {
  let authCookies = {};
  
  // Login before running tests
  beforeAll(async () => {
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'confluity'
      })
    });
    
    // Extract cookies for future requests
    authCookies = getCookiesFromResponse(loginResponse);
  });
  
  test('should return JSON when updating a valid task', async () => {
    // Create a cookie string
    const cookieString = Object.entries(authCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    const response = await fetch(
      `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${VALID_TASK_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    // Check content type is application/json
    expect(response.headers.get('content-type')).toContain('application/json');
    
    // Verify response status
    expect(response.status).toBe(200);
    
    // Test that the response can be parsed as JSON without errors
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      throw new Error(`Response not valid JSON: ${e.message}`);
    }
    
    // Verify the response contains expected fields
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('task');
    expect(responseData).toHaveProperty('message', 'Task updated successfully');
  });
  
  test('should return JSON with appropriate error when task does not exist', async () => {
    // Create a cookie string
    const cookieString = Object.entries(authCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    const response = await fetch(
      `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${NON_EXISTENT_TASK_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    // Check content type is application/json
    expect(response.headers.get('content-type')).toContain('application/json');
    
    // Verify response status
    expect(response.status).toBe(404);
    
    // Test that the response can be parsed as JSON without errors
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      throw new Error(`Response not valid JSON: ${e.message}`);
    }
    
    // Verify the response contains expected error fields
    expect(responseData).toHaveProperty('success', false);
    expect(responseData).toHaveProperty('error', 'TASK_NOT_FOUND');
  });
  
  test('should return JSON with appropriate error on invalid request', async () => {
    // Create a cookie string
    const cookieString = Object.entries(authCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    // Try to update with invalid data (sending an empty object)
    const response = await fetch(
      `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${VALID_TASK_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString
        },
        body: JSON.stringify({}) // Empty update data
      }
    );
    
    // Check content type is application/json
    expect(response.headers.get('content-type')).toContain('application/json');
    
    // Test that the response can be parsed as JSON without errors
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      throw new Error(`Response not valid JSON: ${e.message}`);
    }
    
    // Regardless of status code (could be 200 or 4xx), we just verify it's JSON
    expect(responseData).toBeTruthy();
  });
  
  test('should return JSON when auth is missing or invalid', async () => {
    // Make request with no auth cookies
    const response = await fetch(
      `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${VALID_TASK_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    // Check content type is application/json
    expect(response.headers.get('content-type')).toContain('application/json');
    
    // Verify response status (should be 401 Unauthorized)
    expect(response.status).toBe(401);
    
    // Test that the response can be parsed as JSON without errors
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      throw new Error(`Response not valid JSON: ${e.message}`);
    }
    
    // Verify the response contains authentication error
    expect(responseData).toHaveProperty('message');
    expect(responseData.message.toLowerCase()).toContain('authentication');
  });
});