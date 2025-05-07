/**
 * User Profile Settings Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfileSettings from '../client/src/pages/UserProfileSettings';
import { passwordChangeSchema, userUpdateSchema } from '../shared/schema';
import React from 'react';

// Mock dependencies
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
    mutate: vi.fn(),
    isPending: false
  })),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    clear: vi.fn()
  }))
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    clear: vi.fn(),
    setQueryData: vi.fn()
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

describe('Password Strength Checker', () => {
  it('should calculate correct strength for weak password', () => {
    const weakPassword = 'password';
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: weakPassword,
      confirmPassword: weakPassword
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should calculate correct strength for medium password', () => {
    const mediumPassword = 'Password1';
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: mediumPassword,
      confirmPassword: mediumPassword
    });
    
    expect(result.success).toBe(false); // Still fails because no special char
  });
  
  it('should calculate correct strength for strong password', () => {
    const strongPassword = 'Password123!';
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'current123',
      newPassword: strongPassword,
      confirmPassword: strongPassword
    });
    
    expect(result.success).toBe(true);
  });
});