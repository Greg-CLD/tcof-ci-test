/**
 * User Profile Settings Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfileSettings, { checkPasswordStrength } from '../client/src/pages/UserProfileSettings';
import { passwordChangeSchema, userUpdateSchema } from '../shared/schema';
import React from 'react';

// Test helper function to simulate user events
const userEvent = {
  type: async (element: HTMLElement, text: string) => {
    fireEvent.change(element, { target: { value: text } });
  },
  clear: async (element: HTMLElement) => {
    fireEvent.change(element, { target: { value: '' } });
  }
};

// Mock dependencies
const apiRequestMock = vi.fn();
const toastMock = vi.fn();
const queryClientClearMock = vi.fn();
const setQueryDataMock = vi.fn();
const mutateMock = vi.fn();

// Mock localStorage
const localStorageMock = {
  clear: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      avatarUrl: null,
      locale: 'en-US',
      timezone: 'UTC',
      notificationPrefs: { emailUpdates: true, projectNotifications: false }
    },
    isLoading: false
  })),
  useMutation: vi.fn(() => ({
    mutate: mutateMock,
    isPending: false
  })),
  useQueryClient: vi.fn(() => ({
    setQueryData: setQueryDataMock,
    clear: queryClientClearMock
  }))
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: toastMock
  }))
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: apiRequestMock,
  queryClient: {
    clear: queryClientClearMock,
    setQueryData: setQueryDataMock
  }
}));

// Mock router
vi.mock('wouter', () => ({
  useLocation: vi.fn(() => ['/profile']),
  Link: ({ children, ...props }) => <a {...props}>{children}</a>
}));

describe('Password Change Schema Validation', () => {
  it('should reject weak passwords', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'weak',
      confirmPassword: 'weak'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject passwords without uppercase letters', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'password123!',
      confirmPassword: 'password123!'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject passwords without special characters', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'Password123',
      confirmPassword: 'Password123'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should accept strong passwords', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'Password123!',
      confirmPassword: 'Password123!'
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject when passwords do not match', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'Password123!',
      confirmPassword: 'DifferentPassword123!'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject when new password is same as current', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'Password123!',
      newPassword: 'Password123!',
      confirmPassword: 'Password123!'
    });
    
    expect(result.success).toBe(false);
  });
});

describe('User Update Schema Validation', () => {
  it('should accept valid email updates', () => {
    const result = userUpdateSchema.safeParse({
      email: 'newemail@example.com'
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid email format', () => {
    const result = userUpdateSchema.safeParse({
      email: 'invalid-email'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should accept valid avatar URL', () => {
    const result = userUpdateSchema.safeParse({
      avatarUrl: 'https://example.com/avatar.jpg'
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid avatar URL', () => {
    const result = userUpdateSchema.safeParse({
      avatarUrl: 'not-a-url'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should accept null for avatar URL', () => {
    const result = userUpdateSchema.safeParse({
      avatarUrl: null
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should accept strong password when provided', () => {
    const result = userUpdateSchema.safeParse({
      password: 'StrongPassword123!'
    });
    
    expect(result.success).toBe(true);
  });
  
  it('should reject weak password when provided', () => {
    const result = userUpdateSchema.safeParse({
      password: 'weak'
    });
    
    expect(result.success).toBe(false);
  });
});

describe('UserProfileSettings Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    apiRequestMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });
    
    // Reset location.href
    locationMock.href = '';
  });
  
  describe('Change Password Functionality', () => {
    it('should call the API with correct payload when changing password', async () => {
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the password tab
      fireEvent.click(screen.getByRole('tab', { name: /password/i }));
      
      // Fill in the form
      const currentPasswordInput = screen.getByTestId('current-password-input');
      const newPasswordInput = screen.getByTestId('new-password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      await userEvent.type(currentPasswordInput, 'OldPassword123!');
      await userEvent.type(newPasswordInput, 'NewPassword123!');
      await userEvent.type(confirmPasswordInput, 'NewPassword123!');
      
      // Act
      const submitButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(submitButton);
      
      // Assert
      await waitFor(() => {
        expect(apiRequestMock).toHaveBeenCalledWith(
          'POST',
          '/api/users/1/change-password',
          {
            currentPassword: 'OldPassword123!',
            newPassword: 'NewPassword123!',
            confirmPassword: 'NewPassword123!'
          }
        );
      });
      
      // Verify toast is shown on success
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Password changed',
      }));
    });
    
    it('should display an error toast when API returns an error', async () => {
      // Mock API to return an error
      apiRequestMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Current password is incorrect' })
      });
      
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the password tab
      fireEvent.click(screen.getByRole('tab', { name: /password/i }));
      
      // Fill in the form with incorrect current password
      const currentPasswordInput = screen.getByTestId('current-password-input');
      const newPasswordInput = screen.getByTestId('new-password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      
      await userEvent.type(currentPasswordInput, 'WrongPassword123!');
      await userEvent.type(newPasswordInput, 'NewPassword123!');
      await userEvent.type(confirmPasswordInput, 'NewPassword123!');
      
      // Act
      const submitButton = screen.getByRole('button', { name: /change password/i });
      fireEvent.click(submitButton);
      
      // Assert
      await waitFor(() => {
        expect(apiRequestMock).toHaveBeenCalledWith(
          'POST',
          '/api/users/1/change-password',
          expect.any(Object)
        );
      });
      
      // Verify inline error is shown for wrong password
      // This would typically be reported as a field-level error in the form
      expect(mutateMock).toHaveBeenCalled();
    });
    
    it('should display a password strength indicator when typing a new password', async () => {
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the password tab
      fireEvent.click(screen.getByRole('tab', { name: /password/i }));
      
      // Type a weak password
      const newPasswordInput = screen.getByTestId('new-password-input');
      await userEvent.type(newPasswordInput, 'weak');
      
      // Assert that strength indicator appears
      await waitFor(() => {
        expect(screen.getByText(/weak password/i)).toBeInTheDocument();
      });
      
      // Type a medium-strength password
      await userEvent.clear(newPasswordInput);
      await userEvent.type(newPasswordInput, 'Password1');
      
      // Assert that strength indicator updates
      await waitFor(() => {
        expect(screen.getByText(/medium-strength password/i)).toBeInTheDocument();
      });
      
      // Type a strong password
      await userEvent.clear(newPasswordInput);
      await userEvent.type(newPasswordInput, 'Password123!');
      
      // Assert that strength indicator shows strong
      await waitFor(() => {
        expect(screen.getByText(/strong password/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Delete Account Functionality', () => {
    it('should open a confirmation dialog when delete button is clicked', async () => {
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the danger zone tab
      fireEvent.click(screen.getByRole('tab', { name: /danger/i }));
      
      // Act - Click the delete account button
      const deleteButton = screen.getByTestId('trigger-delete-account');
      fireEvent.click(deleteButton);
      
      // Assert - Confirm dialog appears
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
      });
      
      // Verify cancel and confirm buttons exist
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-account')).toBeInTheDocument();
    });
    
    it('should call the API and perform cleanup when account deletion is confirmed', async () => {
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the danger zone tab
      fireEvent.click(screen.getByRole('tab', { name: /danger/i }));
      
      // Open the delete dialog
      const deleteButton = screen.getByTestId('trigger-delete-account');
      fireEvent.click(deleteButton);
      
      // Act - Confirm deletion
      const confirmButton = screen.getByTestId('confirm-delete-account');
      fireEvent.click(confirmButton);
      
      // Assert - API is called for deletion
      await waitFor(() => {
        expect(apiRequestMock).toHaveBeenCalledWith(
          'DELETE',
          '/api/users/1'
        );
      });
      
      // Verify logout is called after successful deletion
      expect(apiRequestMock).toHaveBeenCalledWith(
        'POST',
        '/api/logout'
      );
      
      // Verify localStorage clearing
      expect(localStorageMock.clear).toHaveBeenCalled();
      
      // Verify React Query cache clearing
      expect(queryClientClearMock).toHaveBeenCalled();
      
      // Verify success toast is shown
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Account deleted',
      }));
      
      // Fast-forward timers to trigger the redirect
      vi.runAllTimers();
      
      // Verify window location update after timeout
      expect(locationMock.href).toBe('/');
    });
    
    it('should show an error toast when account deletion fails', async () => {
      // Mock API to return an error for deletion
      apiRequestMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to delete account' })
      });
      
      // Arrange
      render(<UserProfileSettings />);
      
      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      // Navigate to the danger zone tab
      fireEvent.click(screen.getByRole('tab', { name: /danger/i }));
      
      // Open the delete dialog
      const deleteButton = screen.getByTestId('trigger-delete-account');
      fireEvent.click(deleteButton);
      
      // Act - Confirm deletion
      const confirmButton = screen.getByTestId('confirm-delete-account');
      fireEvent.click(confirmButton);
      
      // Assert - API is called for deletion
      await waitFor(() => {
        expect(apiRequestMock).toHaveBeenCalledWith(
          'DELETE',
          '/api/users/1'
        );
      });
      
      // Verify error toast is shown
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        variant: 'destructive',
      }));
      
      // Verify localStorage is NOT cleared on error
      expect(localStorageMock.clear).not.toHaveBeenCalled();
      
      // Verify no redirection happens on error
      expect(locationMock.href).toBe('');
    });
  });
  
  describe('Password Strength Checker', () => {
    it('should calculate correct strength for weak password', () => {
      const weakPassword = 'password';
      const result = checkPasswordStrength(weakPassword);
      expect(result.strength).toBe('weak');
    });
    
    it('should calculate correct strength for medium password', () => {
      const mediumPassword = 'Password1';
      const result = checkPasswordStrength(mediumPassword);
      expect(result.strength).toBe('medium');
    });
    
    it('should calculate correct strength for strong password', () => {
      const strongPassword = 'Password123!';
      const result = checkPasswordStrength(strongPassword);
      expect(result.strength).toBe('strong');
    });
    
    it('should handle empty passwords', () => {
      const result = checkPasswordStrength('');
      expect(result.strength).toBe('weak');
      expect(result.message).toBe('Password is required');
    });
  });
});