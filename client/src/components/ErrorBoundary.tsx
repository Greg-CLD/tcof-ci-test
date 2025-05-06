import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call onError if it exists
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI if provided, otherwise render default
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">App Error – Safe Mode</h1>
            <p className="text-gray-700 mb-6">
              The application encountered an error and is now in safe mode. Please navigate to the organizations page.
            </p>
            <div className="flex flex-col gap-4">
              <Button 
                onClick={() => {
                  // Clear any stored project IDs that might be causing loops
                  localStorage.removeItem('selectedProjectId');
                  localStorage.removeItem('currentProjectId');
                  
                  // Go to organizations page
                  window.location.href = '/organisations';
                }}
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              >
                Go to Organizations
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Reload the page
                  window.location.reload();
                }}
              >
                Reload Application
              </Button>
            </div>
            <div className="mt-6 text-left">
              <details>
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;