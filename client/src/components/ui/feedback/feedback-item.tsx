import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the type directly
import type { FeedbackItem as FeedbackItemType } from './feedback-context';

interface FeedbackItemProps {
  item: FeedbackItemType;
  onRemove: (id: string) => void;
}

export function FeedbackItem({ item, onRemove }: FeedbackItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Show animation on mount
  useEffect(() => {
    // Small delay to ensure the CSS transition works
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle click on the close button
  const handleClose = () => {
    setIsVisible(false);
    // Give time for exit animation before actual removal
    setTimeout(() => {
      onRemove(item.id);
    }, 300);
  };
  
  // Get the appropriate icon based on the feedback type
  const getIcon = () => {
    switch (item.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />;
      default:
        return null;
    }
  };
  
  // Get background color based on type
  const getBackgroundColor = () => {
    switch (item.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  // Get text color based on type
  const getTextColor = () => {
    switch (item.type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-amber-700';
      case 'info':
        return 'text-blue-700';
      case 'loading':
        return 'text-gray-700';
      default:
        return 'text-gray-700';
    }
  };
  
  return (
    <div
      className={cn(
        'rounded-md border p-4 shadow-sm mb-2 relative flex items-start transition-all duration-300 ease-in-out transform',
        getBackgroundColor(),
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        item.animate ? 'animate-in fade-in slide-in-from-bottom-5' : ''
      )}
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className={cn('text-sm font-medium', getTextColor())}>{item.message}</p>
        </div>
      </div>
      {item.type !== 'loading' && (
        <button
          type="button"
          className={cn(
            'ml-3 -mr-1 -mt-1 p-1.5 rounded-md',
            'hover:bg-opacity-20 hover:bg-gray-900 transition-colors',
            getTextColor()
          )}
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}