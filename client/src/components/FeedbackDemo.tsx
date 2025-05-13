import React from 'react';
import { useFeedback } from '@/hooks/use-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackButton, FeedbackInput, FeedbackCard } from '@/components/ui/feedback';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function FeedbackDemo() {
  const { 
    showSuccess, 
    showError, 
    showInfo, 
    showWarning, 
    showLoading,
    removeFeedback,
    notifyFormSuccess,
    notifyFormError,
    notifySaveSuccess,
    notifySaveError,
    notifyCreateSuccess,
    notifyCreateError,
    notifyUpdateSuccess,
    notifyUpdateError,
    notifyDeleteSuccess,
    notifyDeleteError,
    withLoadingFeedback
  } = useFeedback();

  // Simulates an async operation
  const simulateAsyncOperation = (success = true, delay = 2000) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (success) {
          resolve();
        } else {
          reject(new Error('Simulated error occurred'));
        }
      }, delay);
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-4">Micro-Interaction Feedback System</h1>
        <p className="text-gray-700 mb-6">
          A comprehensive system for providing visual feedback to users during interactions.
        </p>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="components">Enhanced Components</TabsTrigger>
          <TabsTrigger value="helpers">Helper Methods</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Toast Notifications</CardTitle>
              <CardDescription>
                Display different types of notifications to provide feedback to users.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Operation completed successfully!')}
              >
                Show Success
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showError('An error occurred while processing your request.')}
              >
                Show Error
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showInfo('Here is some helpful information.')}
              >
                Show Info
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showWarning('Please be careful with this action.')}
              >
                Show Warning
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  const id = showLoading('Processing your request...');
                  setTimeout(() => {
                    removeFeedback(id);
                    showSuccess('Processing complete!');
                  }, 3000);
                }}
              >
                Show Loading
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Notification Positions</CardTitle>
              <CardDescription>
                Display notifications at different positions on the screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Top notification', { position: 'top' })}
              >
                Top
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Right notification', { position: 'right' })}
              >
                Right
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Bottom notification', { position: 'bottom' })}
              >
                Bottom
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Left notification', { position: 'left' })}
              >
                Left
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => showSuccess('Center notification', { position: 'center' })}
              >
                Center
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Button</CardTitle>
              <CardDescription>
                Buttons with integrated feedback states for async operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeedbackButton
                onClickAsync={async () => await simulateAsyncOperation(true)}
                successText="Success!"
                loadingText="Processing..."
              >
                Successful Operation
              </FeedbackButton>
              
              <FeedbackButton
                onClickAsync={async () => await simulateAsyncOperation(false)}
                errorText="Operation failed"
                loadingText="Processing..."
              >
                Failed Operation
              </FeedbackButton>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Input</CardTitle>
              <CardDescription>
                Input fields with integrated validation and feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <FeedbackInput
                label="Email"
                placeholder="Enter your email"
                helperText="We'll never share your email with anyone else."
                successText="Valid email format"
                validator={(value) => {
                  if (!value) return 'Email is required';
                  if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email format';
                  return true;
                }}
              />
              
              <FeedbackInput
                label="Password"
                type="password"
                placeholder="Enter password"
                helperText="Password must be at least 8 characters"
                successText="Strong password"
                validateOnChange={true}
                validator={(value) => {
                  if (!value) return 'Password is required';
                  if (value.length < 8) return 'Password must be at least 8 characters';
                  return true;
                }}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Cards</CardTitle>
              <CardDescription>
                Cards with click and selection feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FeedbackCard
                title="Clickable Card"
                description="Click me for visual feedback"
                clickable
              >
                <p className="text-sm text-gray-500">
                  This card provides visual feedback when clicked.
                </p>
              </FeedbackCard>
              
              <FeedbackCard
                title="Selectable Card"
                description="Toggle selection state"
                selectable
              >
                <p className="text-sm text-gray-500">
                  This card can be selected/deselected.
                </p>
              </FeedbackCard>
              
              <FeedbackCard
                title="Both Interactions"
                description="Clickable and selectable"
                clickable
                selectable
              >
                <p className="text-sm text-gray-500">
                  This card has both click and selection feedback.
                </p>
              </FeedbackCard>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="helpers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contextual Feedback Helpers</CardTitle>
              <CardDescription>
                Specialized feedback methods for common operations
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Form Operations</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button onClick={() => notifyFormSuccess()}>
                    Form Success
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => notifyFormError()}
                  >
                    Form Error
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Save Operations</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button onClick={() => notifySaveSuccess()}>
                    Save Success
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => notifySaveError()}
                  >
                    Save Error
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">CRUD Operations</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button onClick={() => notifyCreateSuccess()}>
                    Create Success
                  </Button>
                  <Button onClick={() => notifyUpdateSuccess()}>
                    Update Success
                  </Button>
                  <Button onClick={() => notifyDeleteSuccess()}>
                    Delete Success
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Promise Integration</CardTitle>
              <CardDescription>
                Automatically show loading, success, and error states for asynchronous operations
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => {
                  withLoadingFeedback(
                    simulateAsyncOperation(true), 
                    {
                      loadingMessage: 'Processing request...',
                      successMessage: 'Operation completed successfully!',
                      errorMessage: 'Operation failed'
                    }
                  );
                }}
              >
                Successful Async Operation
              </Button>
              
              <Button 
                onClick={() => {
                  withLoadingFeedback(
                    simulateAsyncOperation(false), 
                    {
                      loadingMessage: 'Processing request...',
                      successMessage: 'Operation completed successfully!',
                      errorMessage: 'Operation failed'
                    }
                  ).catch(err => {
                    console.error('Error caught in component:', err);
                  });
                }}
              >
                Failed Async Operation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}