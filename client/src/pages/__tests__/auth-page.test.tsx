import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import AuthPage from '../auth-page';

// Mock auth context
beforeEach(() => {
  vi.mock('@/hooks/use-auth', () => ({
    useAuth: vi.fn().mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      loginMutation: {
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        error: null
      },
      registerMutation: {
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        error: null
      }
    })
  }));

  // Mock wouter's useLocation
  vi.mock('wouter', async () => {
    const actual = await vi.importActual('wouter');
    return {
      ...actual,
      useLocation: () => ['/auth'],
      useRoute: () => [true],
      Link: ({ children, ...props }: any) => (
        <a {...props} data-testid="link">
          {children}
        </a>
      ),
    };
  });
});

describe('Auth Page', () => {
  it('renders login and register forms', () => {
    renderWithProviders(<AuthPage />);
    
    // Check for login and register forms
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
    
    // Check for form inputs
    expect(screen.getAllByLabelText(/username/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/password/i)[0]).toBeInTheDocument();
  });

  it('displays the hero section', () => {
    renderWithProviders(<AuthPage />);
    
    // Check for hero text
    expect(screen.getByText(/Welcome to Confluity/i)).toBeInTheDocument();
  });
});