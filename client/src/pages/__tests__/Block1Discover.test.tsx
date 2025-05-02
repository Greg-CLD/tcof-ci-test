import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import Block1Discover from '../Block1Discover';

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
      useLocation: () => ['/make-a-plan/block-1'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });
});

describe('Block1Discover Page', () => {
  it('renders correctly', async () => {
    renderWithProviders(<Block1Discover />);
    
    // Check for main content elements
    expect(screen.getByText(/Block 1: Discover/i)).toBeInTheDocument();
    
    // Wait for content to load
    const saveButton = await screen.findByText(/Save/i);
    expect(saveButton).toBeInTheDocument();
  });

  it('displays the success factors section', async () => {
    renderWithProviders(<Block1Discover />);
    
    // Check for success factors heading
    const successFactorsHeading = await screen.findByText(/Success Factors/i);
    expect(successFactorsHeading).toBeInTheDocument();
  });
});