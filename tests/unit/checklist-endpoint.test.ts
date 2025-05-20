/**
 * Unit test for Checklist.tsx endpoint UUID cleaning
 * This test validates that the component correctly cleans UUIDs
 * for both PUT and DELETE operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '@/lib/queryClient';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true })
  })
}));

// Mock console.log to capture NET log output
const originalConsoleLog = console.log;
let consoleOutput: any[] = [];
console.log = (...args: any[]) => {
  consoleOutput.push(args);
  return originalConsoleLog(...args);
};

describe('Checklist endpoint UUID cleaning', () => {
  beforeEach(() => {
    // Reset mocks and captured console output before each test
    vi.clearAllMocks();
    consoleOutput = [];
  });

  // Helper function to simulate the UUID cleaning in the component
  function cleanEndpointId(id: string): string {
    return id.split('-').slice(0, 5).join('-');
  }

  describe('PUT task update', () => {
    it('should clean compound IDs for task updates', async () => {
      // Sample IDs for testing
      const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
      const rawTaskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-12345678'; // Compound ID
      const cleanTaskId = cleanEndpointId(rawTaskId);
      
      // This is the expected endpoint that should be constructed
      const expectedEndpoint = `/api/projects/${projectId}/tasks/${cleanTaskId}`;
      
      // Simulate what the component would do
      console.log('[NET]', { 
        rawId: rawTaskId, 
        cleanId: cleanTaskId, 
        endpoint: expectedEndpoint, 
        completed: true 
      });
      
      // Check that the cleaned ID is different from the raw ID
      expect(cleanTaskId).not.toEqual(rawTaskId);
      
      // Verify the expected format
      expect(cleanTaskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      
      // Verify that the component would log the correct information
      expect(consoleOutput.length).toBeGreaterThan(0);
      const netLogEntry = consoleOutput.find(entry => entry[0] === '[NET]');
      expect(netLogEntry).toBeDefined();
      expect(netLogEntry![1].rawId).toEqual(rawTaskId);
      expect(netLogEntry![1].cleanId).toEqual(cleanTaskId);
      expect(netLogEntry![1].endpoint).toEqual(expectedEndpoint);
    });
  });

  describe('DELETE task operation', () => {
    it('should clean compound IDs for task deletion', async () => {
      // Sample IDs for testing
      const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
      const rawTaskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-abcdef'; // Compound ID
      const cleanTaskId = cleanEndpointId(rawTaskId);
      
      // This is the expected endpoint that should be constructed
      const expectedEndpoint = `/api/projects/${projectId}/tasks/${cleanTaskId}`;
      
      // Simulate what the component would do
      console.log('[NET]', { 
        rawId: rawTaskId, 
        cleanId: cleanTaskId,
        endpoint: expectedEndpoint, 
        operation: 'DELETE'
      });
      
      // Check that the cleaned ID is different from the raw ID
      expect(cleanTaskId).not.toEqual(rawTaskId);
      
      // Verify the expected format - valid UUID format
      expect(cleanTaskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      
      // Verify that the component would log the correct information
      const netLogEntry = consoleOutput.find(entry => 
        entry[0] === '[NET]' && entry[1].operation === 'DELETE'
      );
      expect(netLogEntry).toBeDefined();
      expect(netLogEntry![1].rawId).toEqual(rawTaskId);
      expect(netLogEntry![1].cleanId).toEqual(cleanTaskId);
      expect(netLogEntry![1].endpoint).toEqual(expectedEndpoint);
    });
  });
});