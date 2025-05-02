import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProtectionProvider } from '@/hooks/use-auth-protection';

// Create a custom wrapper with all providers
export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProtectionProvider>
      {children}
    </AuthProtectionProvider>
  );
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Mock navigation
export function mockNavigation() {
  vi.mock('wouter', () => {
    const originalModule = vi.importActual('wouter');
    return {
      ...originalModule,
      useLocation: () => ['/'],
      useRoute: () => [true],
      Link: ({ children, ...props }: any) => (
        <a {...props} onClick={(e) => e.preventDefault()}>
          {children}
        </a>
      ),
    };
  });
}

// Reset all mocks
export function resetMocks() {
  vi.resetAllMocks();
  vi.clearAllMocks();
}

// Re-export everything from testing-library
export * from '@testing-library/react';