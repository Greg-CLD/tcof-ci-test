import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import Block3Complete from '../Block3Complete';

// Mock plan helpers and storage functions
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn().mockReturnValue('test-plan-id'),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Mock the plan helpers
  vi.mock('@/lib/planHelpers', () => ({
    getLatestPlanId: vi.fn().mockReturnValue('test-plan-id'),
  }));

  // Mock plan-db
  vi.mock('@/lib/plan-db', () => ({
    loadPlan: vi.fn().mockResolvedValue({
      id: 'test-plan-id',
      stages: {
        Identification: {
          heuristics: [],
          factors: [],
          practiceTasks: [],
          personalHeuristics: []
        },
        Definition: {
          heuristics: [],
          factors: [],
          practiceTasks: [],
          personalHeuristics: []
        },
        Delivery: {
          heuristics: [],
          factors: [],
          practiceTasks: [],
          personalHeuristics: []
        },
        Closure: {
          heuristics: [],
          factors: [],
          practiceTasks: [],
          personalHeuristics: []
        }
      }
    }),
    savePlan: vi.fn().mockResolvedValue(true),
    planExists: vi.fn().mockResolvedValue(true),
  }));

  // Mock wouter's useLocation
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/make-a-plan/block-3'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });

  // Mock export utilities
  vi.mock('@/lib/exportUtils', () => ({
    exportPDF: vi.fn().mockResolvedValue(undefined),
    exportCSV: vi.fn(),
  }));
});

describe('Block3Complete Page', () => {
  it('renders correctly', async () => {
    renderWithProviders(<Block3Complete />);
    
    // Check for main content elements
    expect(screen.getByText(/Block 3: Complete/i)).toBeInTheDocument();
    
    // Wait for content to load
    const finishButton = await screen.findByText(/Finish/i);
    expect(finishButton).toBeInTheDocument();
  });

  it('displays the export options', async () => {
    renderWithProviders(<Block3Complete />);
    
    // Check for export buttons
    expect(await screen.findByText(/Export PDF/i)).toBeInTheDocument();
    expect(await screen.findByText(/Export CSV/i)).toBeInTheDocument();
  });
});