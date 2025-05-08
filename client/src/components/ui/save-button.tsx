import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Whether the save operation is in progress
   */
  isSaving: boolean;
  
  /**
   * Callback function to trigger save
   */
  onSave: () => void | Promise<void>;
  
  /**
   * Text to display when not saving (defaults to "Save Progress")
   */
  saveText?: string;
  
  /**
   * Text to display when saving is in progress (defaults to "Saving...")
   */
  savingText?: string;
  
  /**
   * Whether to show an icon (defaults to true)
   */
  showIcon?: boolean;
}

/**
 * A consistent save button to use across the application.
 * Provides standardized styling, loading state, and error handling.
 */
export function SaveButton({ 
  isSaving, 
  onSave, 
  saveText = "Save Progress", 
  savingText = "Saving...",
  showIcon = true,
  className,
  variant = "outline",
  ...props 
}: SaveButtonProps) {
  
  const handleClick = async () => {
    if (isSaving) return;
    
    try {
      await onSave();
    } catch (error) {
      console.error('Error in SaveButton click handler:', error);
      // Error is handled by the useSaveProgress hook
    }
  };
  
  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={isSaving}
      className={cn("flex items-center", className)}
      {...props}
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {savingText}
        </>
      ) : (
        <>
          {showIcon && <Save className="mr-2 h-4 w-4" />}
          {saveText}
        </>
      )}
    </Button>
  );
}