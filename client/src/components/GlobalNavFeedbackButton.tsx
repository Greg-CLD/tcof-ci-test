import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useFeedback } from '@/hooks/use-feedback';
import { cn } from '@/lib/utils';

interface GlobalNavFeedbackButtonProps extends ButtonProps {
  to: string;
  feedbackText?: string;
  confirmNavigation?: boolean;
  confirmMessage?: string;
  onBeforeNavigate?: () => boolean | Promise<boolean>;
}

/**
 * A navigation button with integrated feedback for global navigation.
 * Shows subtle visual feedback when clicked and optionally confirms navigation.
 */
export function GlobalNavFeedbackButton({
  to,
  children,
  className,
  feedbackText,
  confirmNavigation = false,
  confirmMessage = 'Are you sure you want to navigate away? Any unsaved changes will be lost.',
  onBeforeNavigate,
  ...props
}: GlobalNavFeedbackButtonProps) {
  const [_, navigate] = useLocation();
  const { showInfo } = useFeedback();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleNavigationClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Show visual click feedback
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    
    // Run the onBeforeNavigate handler if provided
    if (onBeforeNavigate) {
      const canNavigate = await onBeforeNavigate();
      if (!canNavigate) {
        // If onBeforeNavigate returns false, don't navigate
        return;
      }
    }
    
    // Show confirmation dialog if confirmNavigation is true
    if (confirmNavigation) {
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    // Show feedback toast if feedbackText is provided
    if (feedbackText) {
      showInfo(feedbackText, { duration: 2000 });
    }
    
    // Navigate to the specified route
    navigate(to);
  };
  
  return (
    <Button
      className={cn(
        className,
        isAnimating ? 'scale-95 opacity-80 transition-all duration-300' : 'transition-all duration-300'
      )}
      onClick={handleNavigationClick}
      {...props}
    >
      {children}
    </Button>
  );
}