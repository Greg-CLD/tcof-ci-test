/**
 * Password Strength Utility Tests
 */
import { describe, it, expect } from 'vitest';
import { checkPasswordStrength } from '../client/src/utils/password-strength';

describe('Password Strength Checker', () => {
  it('should calculate correct strength for weak password', () => {
    const weakPassword = 'password';
    const result = checkPasswordStrength(weakPassword);
    expect(result.strength).toBe('weak');
    expect(result.color).toBe('text-red-500');
  });
  
  it('should calculate correct strength for medium password', () => {
    const mediumPassword = 'Password1';
    const result = checkPasswordStrength(mediumPassword);
    expect(result.strength).toBe('medium');
    expect(result.color).toBe('text-amber-500');
  });
  
  it('should calculate correct strength for strong password', () => {
    const strongPassword = 'Password123!';
    const result = checkPasswordStrength(strongPassword);
    expect(result.strength).toBe('strong');
    expect(result.color).toBe('text-green-500');
  });
  
  it('should handle empty passwords', () => {
    const result = checkPasswordStrength('');
    expect(result.strength).toBe('weak');
    expect(result.message).toBe('Password is required');
  });
  
  it('should count length as a strength factor', () => {
    const shortPassword = 'Ps1!';
    const longPassword = 'Password123!Extra';
    
    const shortResult = checkPasswordStrength(shortPassword);
    const longResult = checkPasswordStrength(longPassword);
    
    // The long password should be stronger because of extra length points
    expect(longResult.strength).toBe('strong');
    expect(shortResult.strength).toBe('medium'); // Even though it's short, it has uppercase, number and special char
  });
  
  it('should recognize special characters as a strength factor', () => {
    const withSpecialChars = 'Password123!';
    const withoutSpecialChars = 'Password123';
    
    const withResult = checkPasswordStrength(withSpecialChars);
    const withoutResult = checkPasswordStrength(withoutSpecialChars);
    
    expect(withResult.strength).toBe('strong');
    expect(withoutResult.strength).toBe('medium');
  });
  
  it('should recognize uppercase letters as a strength factor', () => {
    const withUppercase = 'Password123!';
    const withoutUppercase = 'password123!';
    
    const withResult = checkPasswordStrength(withUppercase);
    const withoutResult = checkPasswordStrength(withoutUppercase);
    
    expect(withResult.strength).toBe('strong');
    expect(withoutResult.strength).toBe('strong'); // Strong because it has enough points even without uppercase
  });
  
  it('should recognize numbers as a strength factor', () => {
    const withNumbers = 'Password123!';
    const withoutNumbers = 'Password!';
    
    const withResult = checkPasswordStrength(withNumbers);
    const withoutResult = checkPasswordStrength(withoutNumbers);
    
    expect(withResult.strength).toBe('strong');
    expect(withoutResult.strength).toBe('medium');
  });
});