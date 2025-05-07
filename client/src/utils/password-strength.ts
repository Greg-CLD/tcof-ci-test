/**
 * Utility to check password strength and return feedback
 */

export type PasswordStrengthResult = {
  strength: 'weak' | 'medium' | 'strong';
  message: string;
  color: string;
};

export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return { 
      strength: 'weak',
      message: 'Password is required',
      color: 'text-red-500'
    };
  }
  
  let score = 0;
  const checks = [
    { regex: /.{8,}/, points: 1 }, // Length >= 8
    { regex: /[A-Z]/, points: 1 }, // Has uppercase
    { regex: /[a-z]/, points: 1 }, // Has lowercase
    { regex: /[0-9]/, points: 1 }, // Has number
    { regex: /[^A-Za-z0-9]/, points: 1 }, // Has special char
    { regex: /.{12,}/, points: 1 }, // Length >= 12 (bonus)
  ];
  
  checks.forEach(check => {
    if (check.regex.test(password)) {
      score += check.points;
    }
  });
  
  if (score <= 2) {
    return {
      strength: 'weak',
      message: 'Weak password',
      color: 'text-red-500'
    };
  } else if (score <= 4) {
    return {
      strength: 'medium',
      message: 'Medium-strength password',
      color: 'text-amber-500'
    };
  } else {
    return {
      strength: 'strong',
      message: 'Strong password',
      color: 'text-green-500'
    };
  }
};