import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import Block2Design from '../Block2Design';

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
      useLocation: () => ['/make-a-plan/block-2'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });
});

describe('Block2Design Page', () => {
  it('renders correctly', async () => {
    renderWithProviders(<Block2Design />);
    
    // Check for main content elements
    expect(screen.getByText(/Block 2: Design/i)).toBeInTheDocument();
    
    // Wait for content to load
    const saveButton = await screen.findByText(/Save/i);
    expect(saveButton).toBeInTheDocument();
  });

  it('displays the tasks section', async () => {
    renderWithProviders(<Block2Design />);
    
    // Check for tasks heading
    const tasksHeading = await screen.findByText(/Tasks/i);
    expect(tasksHeading).toBeInTheDocument();
  });
});