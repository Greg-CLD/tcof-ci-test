import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import MakeAPlanLanding from '../MakeAPlanLanding';

// Mock localStorage
beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Mock wouter's useLocation
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/make-a-plan'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });

  // Mock the plan helpers
  vi.mock('@/lib/planHelpers', () => ({
    hasExistingPlan: vi.fn().mockResolvedValue(false),
    getAllPlans: vi.fn().mockResolvedValue([]),
  }));
});

describe('MakeAPlanLanding Page', () => {
  it('renders correctly', async () => {
    renderWithProviders(<MakeAPlanLanding />);
    
    // Check for main content elements
    expect(screen.getByText(/Make a Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a structured plan/i)).toBeInTheDocument();
  });

  it('displays the quick start option', async () => {
    renderWithProviders(<MakeAPlanLanding />);
    
    // Check for quick start button
    const quickStartBtn = screen.getByText(/Quick Start/i);
    expect(quickStartBtn).toBeInTheDocument();
  });
});