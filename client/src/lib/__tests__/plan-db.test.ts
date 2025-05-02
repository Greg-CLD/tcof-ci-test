import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { savePlan, loadPlan, PlanRecord } from '@/lib/plan-db';

describe('Plan Database Functions', () => {
  // Create a mock plan for testing
  const testPlanId = 'test-plan-id';
  const testPlan: PlanRecord = {
    id: testPlanId,
    name: 'Test Plan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: {
      Identification: {
        heuristics: [
          { id: 'h1', text: 'Test heuristic', completed: false }
        ],
        factors: [
          { id: 'f1', text: 'Test factor', impact: 'high' as const }
        ],
        practiceTasks: [
          { id: 'pt1', text: 'Test task', completed: false }
        ],
        personalHeuristics: [
          { id: 'ph1', text: 'Personal heuristic', notes: 'Notes', favourite: false }
        ]
      }
    }
  };

  // Mock localStorage before each test
  beforeEach(() => {
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = String(value);
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        length: 0,
        key: () => null,
      };
    })();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  // Clear mocks after each test
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should save a plan to storage and retrieve it correctly', async () => {
    // Save the plan
    const result = await savePlan(testPlanId, testPlan);
    
    // Verify the save was successful
    expect(result).toBe(true);
    
    // Verify the plan was saved to localStorage correctly
    const savedItem = localStorage.getItem(`tcof_plan_${testPlanId}`);
    expect(savedItem).toBeTruthy();
    
    if (savedItem) {
      const savedPlan = JSON.parse(savedItem);
      expect(savedPlan.id).toBe(testPlanId);
      expect(savedPlan.stages.Identification.heuristics[0].text).toBe('Test heuristic');
    }
    
    // Load the plan back to verify it loads correctly
    const loadedPlan = await loadPlan(testPlanId);
    
    // Check loaded plan structure
    expect(loadedPlan).toBeTruthy();
    if (loadedPlan) {
      expect(loadedPlan.id).toBe(testPlanId);
      expect(loadedPlan.stages.Identification.heuristics).toHaveLength(1);
      expect(loadedPlan.stages.Identification.factors).toHaveLength(1);
      expect(loadedPlan.stages.Identification.practiceTasks).toHaveLength(1);
      expect(loadedPlan.stages.Identification.personalHeuristics).toHaveLength(1);
    }
  });
});