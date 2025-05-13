import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useFeedback } from './feedback-context';
import { cn } from '@/lib/utils';

interface FeedbackButtonProps extends ButtonProps {
  loadingText?: string;
  successText?: string;
  errorText?: string;
  successDuration?: number;
  errorDuration?: number;
  onClickAsync?: () => Promise<void>;
}

export function FeedbackButton({
  children,
  loadingText = 'Processing...',
  successText = 'Success!',
  errorText = 'An error occurred',
  successDuration = 1500,
  errorDuration = 2000,
  onClickAsync,
  onClick,
  className,
  ...props
}: FeedbackButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { showSuccess, showError } = useFeedback();
  
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }
    
    // If no async function provided, return early
    if (!onClickAsync) return;
    
    try {
      setState('loading');
      await onClickAsync();
      
      // Show success state
      setState('success');
      showSuccess(successText);
      
      // Reset after duration
      setTimeout(() => {
        setState('idle');
      }, successDuration);
      
    } catch (error) {
      // Show error state
      setState('error');
      showError(errorText + (error instanceof Error ? `: ${error.message}` : ''));
      
      // Reset after duration
      setTimeout(() => {
        setState('idle');
      }, errorDuration);
    }
  };
  
  // Determine button content based on state
  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText}
          </>
        );
      case 'success':
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            {successText}
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            {errorText}
          </>
        );
      default:
        return children;
    }
  };
  
  // Determine button style based on state
  const getStateClassName = () => {
    switch (state) {
      case 'loading':
        return 'opacity-80 cursor-not-allowed';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-600';
      default:
        return '';
    }
  };
  
  return (
    <Button
      className={cn(className, getStateClassName())}
      onClick={handleClick}
      disabled={state === 'loading'}
      {...props}
    >
      {getContent()}
    </Button>
  );
}