import React, { useState, ChangeEvent, FocusEvent } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackInputProps extends Omit<InputProps, 'onChange'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>, isValid: boolean) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>, isValid: boolean) => void;
  validator?: (value: string) => boolean | string;
  showIcons?: boolean;
}

export function FeedbackInput({
  label,
  helperText,
  errorText,
  successText,
  validateOnBlur = true,
  validateOnChange = false,
  onChange,
  onBlur,
  validator,
  showIcons = true,
  className,
  ...props
}: FeedbackInputProps) {
  const [value, setValue] = useState(props.defaultValue?.toString() || '');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Function to validate the input
  const validate = (inputValue: string) => {
    if (!validator) return true;
    
    const result = validator(inputValue);
    
    if (result === true) {
      setError(null);
      setSuccess(true);
      return true;
    } else if (typeof result === 'string') {
      setError(result);
      setSuccess(false);
      return false;
    } else {
      setError(errorText || 'Invalid input');
      setSuccess(false);
      return false;
    }
  };
  
  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    let isValid = true;
    
    // If validation on change is enabled, validate
    if (validateOnChange && touched) {
      isValid = validate(newValue);
    } else {
      // Clear previous validation state
      setError(null);
      setSuccess(false);
    }
    
    // Call original onChange if provided
    if (onChange) {
      onChange(e, isValid);
    }
  };
  
  // Handle input blur
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    
    let isValid = true;
    
    // If validation on blur is enabled, validate
    if (validateOnBlur) {
      isValid = validate(value);
    }
    
    // Call original onBlur if provided
    if (onBlur) {
      onBlur(e, isValid);
    }
  };
  
  // Determine icon
  const getIcon = () => {
    if (!showIcons) return null;
    
    if (error) {
      return <X className="h-4 w-4 text-red-500" />;
    } else if (success) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    return null;
  };
  
  return (
    <div className="w-full space-y-2">
      {label && (
        <Label htmlFor={props.id}>
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          className={cn(
            error ? 'border-red-300 pr-10' : '',
            success ? 'border-green-300 pr-10' : '',
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        
        {(error || success) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {getIcon()}
          </div>
        )}
      </div>
      
      {error ? (
        <div className="text-sm text-red-500 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      ) : success && successText ? (
        <div className="text-sm text-green-500 flex items-center">
          <Check className="h-4 w-4 mr-1" />
          {successText}
        </div>
      ) : helperText ? (
        <div className="text-sm text-gray-500 flex items-center">
          <Info className="h-4 w-4 mr-1" />
          {helperText}
        </div>
      ) : null}
    </div>
  );
}