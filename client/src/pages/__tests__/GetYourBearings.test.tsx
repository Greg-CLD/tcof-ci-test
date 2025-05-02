import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import GetYourBearings from '../GetYourBearings';

beforeEach(() => {
  // Mock wouter's useLocation
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/get-your-bearings'],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });
});

describe('GetYourBearings Page', () => {
  it('renders correctly', () => {
    renderWithProviders(<GetYourBearings />);
    
    // Check for main content elements
    expect(screen.getByText(/Get Your Bearings/i)).toBeInTheDocument();
    expect(screen.getByText(/Use these tools to understand/i)).toBeInTheDocument();
  });

  it('displays all three assessment tools', () => {
    renderWithProviders(<GetYourBearings />);
    
    // Check for the three tool options
    expect(screen.getByText(/Goal Mapping Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/Cynefin Orientation Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/TCOF Journey Tool/i)).toBeInTheDocument();
  });
});