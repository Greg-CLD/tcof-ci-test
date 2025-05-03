import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the modules we need to test
vi.mock('../client/src/lib/plan-db', () => ({
  createEmptyPlan: vi.fn().mockResolvedValue('test-plan-id'),
  loadPlan: vi.fn(),
  savePlan: vi.fn().mockResolvedValue(true),
  planExists: vi.fn().mockResolvedValue(true),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch for loading preset heuristics
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes('presetHeuristics.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { id: "H1", text: "Start slow to go fast", notes: "" },
        { id: "H2", text: "Test it small before you scale it big", notes: "" }
      ])
    });
  }
  return Promise.reject(new Error(`Unhandled fetch url: ${url}`));
});

// Import after mocking
import { quickStartPlan } from '../client/src/lib/planHelpers';
import { createEmptyPlan, loadPlan, savePlan } from '../client/src/lib/plan-db';

describe('quickStartPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Set up a basic mock plan response
    loadPlan.mockResolvedValue({
      id: 'test-plan-id',
      name: 'Test Plan',
      createdAt: '2025-05-02T10:00:00.000Z',
      lastUpdated: '2025-05-02T10:00:00.000Z',
      stages: {
        Identification: {
          personalHeuristics: [],
          factors: []
        },
        Definition: {
          personalHeuristics: [],
          factors: []
        },
        Delivery: {
          personalHeuristics: [],
          factors: []
        },
        Closure: {
          personalHeuristics: [],
          factors: []
        }
      }
    });
  });

  it('should create a new plan with preset heuristics and success factors', async () => {
    const planId = await quickStartPlan();
    
    // Verify that createEmptyPlan was called
    expect(createEmptyPlan).toHaveBeenCalledTimes(1);
    
    // Verify that loadPlan was called with the right ID
    expect(loadPlan).toHaveBeenCalledWith('test-plan-id');
    
    // Verify that savePlan was called at least once
    expect(savePlan).toHaveBeenCalledTimes(1);
    
    // Capture the saved plan data
    const savedPlanData = savePlan.mock.calls[0][1];
    
    // Check that personalHeuristics contains at least 1 heuristic
    expect(savedPlanData.stages.Identification.personalHeuristics.length).toBeGreaterThanOrEqual(1);
    
    // Count all success factors across all stages
    let totalFactors = 0;
    Object.keys(savedPlanData.stages).forEach(stageName => {
      totalFactors += savedPlanData.stages[stageName].factors.length;
    });
    
    // Verify there are at least 12 success factors total
    expect(totalFactors).toBeGreaterThanOrEqual(12);
    
    // Verify plan ID was saved to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('tcof_most_recent_plan', 'test-plan-id');
    
    // Verify the function returns the correct plan ID
    expect(planId).toBe('test-plan-id');
  });

  it('should handle errors when create/load plan fails', async () => {
    // Make createEmptyPlan fail
    createEmptyPlan.mockRejectedValueOnce(new Error('Failed to create plan'));
    
    // Verify the function properly rejects
    await expect(quickStartPlan()).rejects.toThrow('Quick-Start failed');
  });

  it('should handle errors when saving plan fails', async () => {
    // Make savePlan fail
    savePlan.mockResolvedValueOnce(false);
    
    // Verify the function properly rejects
    await expect(quickStartPlan()).rejects.toThrow('Failed to save plan');
  });
});