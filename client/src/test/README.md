# Confluity TCOF Toolkit Test Suite

This directory contains test utilities and configurations for testing the Confluity TCOF Toolkit application.

## Test Structure

- `__tests__` directories contain test files for components and pages
- Tests are written using Vitest and React Testing Library
- Test utilities are available in `client/src/test/test-utils.tsx`

## Running Tests

The following npm scripts are available for running tests:

```bash
# Run all tests once
npm test

# Run tests in watch mode (good for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Utilities

The `test-utils.tsx` file provides:

- `renderWithProviders` - Renders components with all required providers
- `mockNavigation` - Mocks wouter navigation
- `resetMocks` - Resets all mocks between tests

## Writing Tests

When writing new tests, follow these guidelines:

1. Create test files in the `__tests__` directory next to the code you're testing
2. For component tests, use the `renderWithProviders` function 
3. For page tests, ensure you mock all required context providers and functions
4. Test for the presence of key UI elements using accessible queries (getByRole, getByText, etc.)
5. Use `data-testid` attributes sparingly and only when necessary

Example:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText(/my component/i)).toBeInTheDocument();
  });
});
```

## Mocking Data

For data-dependent tests, mock the data sources rather than using real data:

```tsx
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('test-value'),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock API calls
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test-data' }),
}));
```

## Coverage Reports

Coverage reports are generated using V8 coverage provider and can be found in the `coverage` directory after running `npm run test:coverage`.