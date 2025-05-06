import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../client/src/lib/queryClient';
import OrganisationListPage from '../../client/src/pages/OrganisationListPage';

// Mock the react-query hooks
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn().mockReturnValue({
    data: [
      {
        id: '1',
        name: 'Test Organisation 1',
        description: 'This is a test organisation',
        role: 'owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Test Organisation 2',
        description: 'Another test organisation',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    isLoading: false,
    error: null
  }),
  useMutation: jest.fn().mockReturnValue({
    mutate: jest.fn(),
    isPending: false
  })
}));

// Mock the wouter hook
jest.mock('wouter', () => ({
  useLocation: () => ['/organisations', jest.fn()],
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('OrganisationListPage', () => {
  it('renders organization cards correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OrganisationListPage />
      </QueryClientProvider>
    );
    
    // Verify the page title is rendered
    expect(screen.getByText('Your Organisations')).toBeInTheDocument();
    
    // Verify the organisation names are rendered
    expect(screen.getByText('Test Organisation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Organisation 2')).toBeInTheDocument();
    
    // Verify their descriptions
    expect(screen.getByText('This is a test organisation')).toBeInTheDocument();
    expect(screen.getByText('Another test organisation')).toBeInTheDocument();
    
    // Verify the role badges
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    
    // Verify action buttons
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(2);
    
    const viewButtons = screen.getAllByText('View');
    expect(viewButtons.length).toBe(2);
  });
});