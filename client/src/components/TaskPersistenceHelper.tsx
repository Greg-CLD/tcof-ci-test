import React, { useEffect, useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  testLoadTasks,
  testCreateTask,
  testUpdateTask,
  testTaskLifecycle,
  analyzeDatabase
} from '../lib/taskTestHelpers';

/**
 * This component provides a UI for testing task persistence functionality
 */
export function TaskPersistenceHelper({ projectId }: { projectId: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  
  // Override console.log for capturing test results
  useEffect(() => {
    if (!isVisible) return;
    
    const originalLog = console.log;
    const originalError = console.error;
    
    // Create a custom logger that captures log messages
    console.log = (...args) => {
      // Call the original console.log
      originalLog(...args);
      
      // Capture the log message
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Add to our test results
      setTestResults(prev => [...prev, { type: 'log', message }]);
    };
    
    console.error = (...args) => {
      // Call the original console.error
      originalError(...args);
      
      // Capture the error message
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Add to our test results
      setTestResults(prev => [...prev, { type: 'error', message }]);
    };
    
    // Clean up by restoring the original console.log
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [isVisible]);
  
  // Run a test and handle its state
  const runTest = async (
    testFn: Function, 
    name: string, 
    ...args: any[]
  ) => {
    setIsLoading(true);
    setStatus('idle');
    setMessage(`Running ${name}...`);
    setTestResults([]);
    
    try {
      // Start a new test group in console
      console.group(`🧪 Test: ${name}`);
      
      // Run the test function with provided arguments
      const result = await testFn(...args);
      
      setStatus('success');
      setMessage(`${name} completed successfully!`);
      
      // End the console group
      console.groupEnd();
      
      return result;
    } catch (error) {
      console.error(`Test failed:`, error);
      setStatus('error');
      setMessage(`${name} failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // End the console group
      console.groupEnd();
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
        >
          Task Persistence Helper
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 shadow-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Task Persistence Helper
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsVisible(false)}
            >
              X
            </Button>
          </CardTitle>
          <CardDescription>Test task persistence for project: {projectId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => runTest(testLoadTasks, 'Load Tasks', projectId)}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Load Tasks
              </Button>
              <Button
                onClick={async () => {
                  const task = await runTest(testCreateTask, 'Create Task', projectId);
                  if (task && task.id) {
                    setMessage(`Task created with ID: ${task.id}`);
                  }
                }}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Create Test Task
              </Button>
              <Button
                onClick={() => runTest(testTaskLifecycle, 'Full Lifecycle Test', projectId)}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Run Full Lifecycle Test
              </Button>
              <Button
                onClick={() => runTest(analyzeDatabase, 'Analyze Database')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Analyze Database
              </Button>
            </div>
            
            {/* Status indicator */}
            <div className="mt-4 text-center">
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{message}</span>
                </div>
              ) : status === 'success' ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{message}</span>
                </div>
              ) : status === 'error' ? (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>{message}</span>
                </div>
              ) : null}
            </div>
            
            {/* Test results */}
            {testResults.length > 0 && (
              <div className="mt-4 border rounded p-2 max-h-32 overflow-y-auto text-xs">
                {testResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`${result.type === 'error' ? 'text-red-600' : ''} mb-1`}
                  >
                    {result.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => setTestResults([])}
          >
            Clear Results
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => setIsVisible(false)}
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}