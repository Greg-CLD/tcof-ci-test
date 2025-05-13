import { useFeedback as useContextFeedback, FeedbackType } from '@/components/ui/feedback';

/**
 * Custom hook for easier access to feedback functionality across the application
 * 
 * This hook provides simplified access to the most commonly used feedback methods
 * and includes helper functions for specific use cases.
 */
export function useFeedback() {
  const feedback = useContextFeedback();
  
  // Return the original feedback functions and add additional utility functions
  return {
    ...feedback,
    
    /**
     * Show a notification for a successful form submission
     */
    notifyFormSuccess: (message = 'Form submitted successfully') => {
      return feedback.showSuccess(message, { position: 'top' });
    },
    
    /**
     * Show a notification for form validation errors
     */
    notifyFormError: (message = 'Please fix the errors in the form') => {
      return feedback.showError(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a successful save operation
     */
    notifySaveSuccess: (message = 'Changes saved successfully') => {
      return feedback.showSuccess(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a failed save operation
     */
    notifySaveError: (message = 'Failed to save changes') => {
      return feedback.showError(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a successful delete operation
     */
    notifyDeleteSuccess: (message = 'Item deleted successfully') => {
      return feedback.showSuccess(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a failed delete operation
     */
    notifyDeleteError: (message = 'Failed to delete item') => {
      return feedback.showError(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a successful create operation
     */
    notifyCreateSuccess: (message = 'Item created successfully') => {
      return feedback.showSuccess(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a failed create operation
     */
    notifyCreateError: (message = 'Failed to create item') => {
      return feedback.showError(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a successful update operation
     */
    notifyUpdateSuccess: (message = 'Item updated successfully') => {
      return feedback.showSuccess(message, { position: 'top' });
    },
    
    /**
     * Show a notification for a failed update operation
     */
    notifyUpdateError: (message = 'Failed to update item') => {
      return feedback.showError(message, { position: 'top' });
    },
    
    /**
     * Show a loading notification and automatically hide it when the promise resolves
     * Replace it with a success or error notification based on the result
     */
    withLoadingFeedback: async <T>(
      promise: Promise<T>,
      options: {
        loadingMessage?: string;
        successMessage?: string;
        errorMessage?: string;
        position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
      } = {}
    ): Promise<T> => {
      const {
        loadingMessage = 'Loading...',
        successMessage = 'Operation completed successfully',
        errorMessage = 'Operation failed',
        position = 'top'
      } = options;
      
      // Show loading notification
      const loadingId = feedback.showLoading(loadingMessage, { position });
      
      try {
        // Wait for the promise to resolve
        const result = await promise;
        
        // Remove loading notification and show success
        feedback.removeFeedback(loadingId);
        feedback.showSuccess(successMessage, { position });
        
        return result;
      } catch (error) {
        // Remove loading notification and show error
        feedback.removeFeedback(loadingId);
        
        let finalErrorMessage = errorMessage;
        if (error instanceof Error) {
          finalErrorMessage = `${errorMessage}: ${error.message}`;
        }
        
        feedback.showError(finalErrorMessage, { position });
        throw error;
      }
    }
  };
}