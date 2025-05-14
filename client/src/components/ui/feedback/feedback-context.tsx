import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the types of micro-interactions we'll support
export type FeedbackType = 'success' | 'error' | 'loading' | 'info' | 'warning';
export type { FeedbackContextType };

// Define the feedback item structure
export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  targetElement?: string; // CSS selector for the element to attach feedback to
  duration?: number; // How long to display the feedback (in ms)
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  animate?: boolean;
}

// Interface for our context
interface FeedbackContextType {
  // Current feedback items
  feedbackItems: FeedbackItem[];
  
  // Methods to add different types of feedback
  addFeedback: (feedback: Omit<FeedbackItem, 'id'>) => string;
  removeFeedback: (id: string) => void;
  
  // Convenience methods for common feedback types
  showSuccess: (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => string;
  showError: (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => string;
  showLoading: (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => string;
  showInfo: (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => string;
  showWarning: (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => string;
}

// Create the context with a default empty value
const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

// Generate a unique ID for feedback items
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Provider component
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);

  // Add a new feedback item
  const addFeedback = (feedback: Omit<FeedbackItem, 'id'>): string => {
    const id = generateId();
    const newFeedback = { ...feedback, id };
    
    setFeedbackItems((prev) => [...prev, newFeedback]);
    
    // Automatically remove the feedback after its duration if specified
    if (feedback.duration) {
      setTimeout(() => {
        removeFeedback(id);
      }, feedback.duration);
    }
    
    return id;
  };

  // Remove a feedback item by ID
  const removeFeedback = (id: string) => {
    setFeedbackItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Convenience methods for different feedback types
  const showSuccess = (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => {
    return addFeedback({
      type: 'success',
      message,
      duration: 3000, // Default 3 seconds
      animate: true,
      ...options
    });
  };

  const showError = (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => {
    return addFeedback({
      type: 'error',
      message,
      duration: 5000, // Default 5 seconds for errors
      animate: true,
      ...options
    });
  };

  const showLoading = (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => {
    return addFeedback({
      type: 'loading',
      message,
      animate: true,
      ...options
    });
  };

  const showInfo = (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => {
    return addFeedback({
      type: 'info',
      message,
      duration: 3000,
      animate: true,
      ...options
    });
  };

  const showWarning = (message: string, options?: Partial<Omit<FeedbackItem, 'id' | 'type' | 'message'>>) => {
    return addFeedback({
      type: 'warning',
      message,
      duration: 4000,
      animate: true,
      ...options
    });
  };

  // Create the context value object with all our methods
  const contextValue: FeedbackContextType = {
    feedbackItems,
    addFeedback,
    removeFeedback,
    showSuccess,
    showError,
    showLoading,
    showInfo,
    showWarning
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
}

// Custom hook to use the feedback context
export function useFeedback() {
  const context = useContext(FeedbackContext);
  
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  
  return context;
}