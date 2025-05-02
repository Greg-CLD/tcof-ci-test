import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import Home from '../Home';

// Mock the window.matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock wouter's useLocation
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });
});

describe('Home Page', () => {
  it('renders correctly', () => {
    renderWithProviders(<Home />);
    
    // Check for main content elements
    expect(screen.getByText(/Connected Outcomes Framework/i)).toBeInTheDocument();
    expect(screen.getByText(/Make a Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Get Your Bearings/i)).toBeInTheDocument();
    expect(screen.getByText(/Who Should Use These Tools?/i)).toBeInTheDocument();
  });

  it('displays the main CTA cards', () => {
    renderWithProviders(<Home />);
    
    // Check for the two main action cards
    const getYourBearingsCard = screen.getByText(/Get Your Bearings/i);
    const makeAPlanCard = screen.getByText(/Make a Plan/i);
    
    expect(getYourBearingsCard).toBeInTheDocument();
    expect(makeAPlanCard).toBeInTheDocument();
  });
});