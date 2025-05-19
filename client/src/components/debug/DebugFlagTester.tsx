import React, { useEffect, useState } from 'react';
import { 
  DEBUG, 
  DEBUG_TASKS, 
  DEBUG_FILTERS, 
  DEBUG_FILES,
  DEBUG_TASK_API,
  DEBUG_TASK_MAPPING,
  DEBUG_TASK_COMPLETION,
  DEBUG_TASK_VALIDATION,
  DEBUG_TASK_PERSISTENCE,
  DEBUG_TASK_STATE
} from '@shared/constants.debug';
import { Button } from '@/components/ui/button';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Bug } from "lucide-react";

/**
 * Advanced Debug Flag Tester component
 * This component allows developers to view and toggle debug flags at runtime
 * Note: Settings are now saved to localStorage and persist across page reloads
 */
export default function DebugFlagTester() {
  const { toast } = useToast();
  
  // Get initial states from localStorage first, then fall back to global constants
  const getInitialState = (key, defaultValue) => {
    const stored = localStorage.getItem(`debug_${key}`);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultValue;
  };
  
  // Runtime debug flag states - initialize from localStorage
  const [generalDebug, setGeneralDebug] = useState(() => getInitialState('general', DEBUG));
  const [taskDebug, setTaskDebug] = useState(() => getInitialState('tasks', DEBUG_TASKS));
  const [filterDebug, setFilterDebug] = useState(() => getInitialState('filters', DEBUG_FILTERS));
  const [fileDebug, setFileDebug] = useState(() => getInitialState('files', DEBUG_FILES));
  
  // Granular task-specific debug states - initialize from localStorage
  const [taskApiDebug, setTaskApiDebug] = useState(() => getInitialState('task_api', DEBUG_TASK_API));
  const [taskMappingDebug, setTaskMappingDebug] = useState(() => getInitialState('task_mapping', DEBUG_TASK_MAPPING));
  const [taskCompletionDebug, setTaskCompletionDebug] = useState(() => getInitialState('task_completion', DEBUG_TASK_COMPLETION));
  const [taskValidationDebug, setTaskValidationDebug] = useState(() => getInitialState('task_validation', DEBUG_TASK_VALIDATION));
  const [taskPersistenceDebug, setTaskPersistenceDebug] = useState(() => getInitialState('task_persistence', DEBUG_TASK_PERSISTENCE));
  const [taskStateDebug, setTaskStateDebug] = useState(() => getInitialState('task_state', DEBUG_TASK_STATE));
  
  // Additional state for test logging confirmation
  const [testLogConfirmation, setTestLogConfirmation] = useState(false);

  // Get overall diagnostics status
  const isDiagnosticsActive = generalDebug || taskDebug || filterDebug || fileDebug;
  const isTaskDiagnosticsActive = taskDebug && (
    taskApiDebug || taskMappingDebug || taskCompletionDebug || 
    taskValidationDebug || taskPersistenceDebug || taskStateDebug
  );

  useEffect(() => {
    // Log current debug flag status
    console.log('[DEBUG_TESTER] Debug Flag Status:', {
      DEBUG: generalDebug,
      DEBUG_TASKS: taskDebug,
      DEBUG_FILTERS: filterDebug,
      DEBUG_FILES: fileDebug,
      DEBUG_TASK_API: taskApiDebug,
      DEBUG_TASK_MAPPING: taskMappingDebug,
      DEBUG_TASK_COMPLETION: taskCompletionDebug,
      DEBUG_TASK_VALIDATION: taskValidationDebug,
      DEBUG_TASK_PERSISTENCE: taskPersistenceDebug,
      DEBUG_TASK_STATE: taskStateDebug
    });
    
    // Runtime controls are simulated as real environment variables can't be changed at runtime
    if (generalDebug) console.log('[DEBUG] General debug mode is enabled');
    if (taskDebug) console.log('[DEBUG_TASKS] Task debugging is enabled');
    if (filterDebug) console.log('[DEBUG_FILTERS] Filter debugging is enabled');
    if (fileDebug) console.log('[DEBUG_FILES] File operation debugging is enabled');
    
    // Log granular task debug flags
    if (taskApiDebug) console.log('[DEBUG_TASK_API] Task API debugging is enabled');
    if (taskMappingDebug) console.log('[DEBUG_TASK_MAPPING] Task mapping debugging is enabled');
    if (taskCompletionDebug) console.log('[DEBUG_TASK_COMPLETION] Task completion debugging is enabled');
    if (taskValidationDebug) console.log('[DEBUG_TASK_VALIDATION] Task validation debugging is enabled');
    if (taskPersistenceDebug) console.log('[DEBUG_TASK_PERSISTENCE] Task persistence debugging is enabled');
    if (taskStateDebug) console.log('[DEBUG_TASK_STATE] Task state transition debugging is enabled');
  }, [
    generalDebug, 
    taskDebug, 
    filterDebug, 
    fileDebug, 
    taskApiDebug, 
    taskMappingDebug,
    taskCompletionDebug,
    taskValidationDebug,
    taskPersistenceDebug,
    taskStateDebug
  ]);
  
  // Clear the test log confirmation after 3 seconds
  useEffect(() => {
    if (testLogConfirmation) {
      const timer = setTimeout(() => {
        setTestLogConfirmation(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [testLogConfirmation]);
  
  // Helper function to toggle debug flags in localStorage and show toast notification
  const toggleDebugFlag = (flag, value) => {
    try {
      localStorage.setItem(`debug_${flag}`, value ? 'true' : 'false');
      console.log(`[DEBUG_TESTER] Set ${flag} to ${value}`);
      
      // Show toast notification
      toast({
        title: value ? "Diagnostics Enabled" : "Diagnostics Disabled",
        description: `${flag.charAt(0).toUpperCase() + flag.slice(1)} debugging is now ${value ? 'active' : 'inactive'}`,
        variant: value ? "default" : "secondary",
      });
      
      // Special case for general task debugging
      if (flag === 'tasks' && !value) {
        // If turning off general task debugging, also turn off all specific task flags
        setTaskApiDebug(false);
        setTaskMappingDebug(false);
        setTaskCompletionDebug(false);
        setTaskValidationDebug(false);
        setTaskPersistenceDebug(false);
        setTaskStateDebug(false);
        
        localStorage.setItem('debug_task_api', 'false');
        localStorage.setItem('debug_task_mapping', 'false');
        localStorage.setItem('debug_task_completion', 'false');
        localStorage.setItem('debug_task_validation', 'false');
        localStorage.setItem('debug_task_persistence', 'false');
        localStorage.setItem('debug_task_state', 'false');
        
        toast({
          title: "Task Diagnostics Disabled",
          description: "All task-specific diagnostic flags have been turned off",
          variant: "secondary",
        });
      }
    } catch (e) {
      console.error('Error setting debug flag:', e);
      toast({
        title: "Error",
        description: "Failed to save diagnostic settings",
        variant: "destructive",
      });
    }
  };
  
  // Enable a special debug mode for SuccessFactor task debugging
  const enableSuccessFactorDebugging = () => {
    // Enable all task-related debugging focused on the SuccessFactor task completion bug
    setTaskDebug(true);
    setTaskApiDebug(true);
    setTaskCompletionDebug(true);
    setTaskPersistenceDebug(true);
    setTaskStateDebug(true);
    
    // Save to localStorage
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_api', 'true');
    localStorage.setItem('debug_task_completion', 'true');
    localStorage.setItem('debug_task_persistence', 'true');
    localStorage.setItem('debug_task_state', 'true');
    
    console.log('[DEBUG_TESTER] SuccessFactor Task Debugging Mode Enabled');
    console.log('[DEBUG_TESTER] Ready to track task completion persistence issues');
    
    // Show toast notification
    toast({
      title: "SuccessFactor Task Debugging Enabled",
      description: "Logging activated for API, completion, persistence, and state transitions",
      variant: "default",
    });
  };
  
  // Enable comprehensive task diagnostics
  const enableTaskDiagnostics = () => {
    // Enable all task-related debugging
    setGeneralDebug(true);
    setTaskDebug(true);
    setTaskApiDebug(true);
    setTaskMappingDebug(true);
    setTaskCompletionDebug(true);
    setTaskValidationDebug(true);
    setTaskPersistenceDebug(true);
    setTaskStateDebug(true);
    
    // Save to localStorage
    localStorage.setItem('debug_general', 'true');
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_api', 'true');
    localStorage.setItem('debug_task_mapping', 'true');
    localStorage.setItem('debug_task_completion', 'true');
    localStorage.setItem('debug_task_validation', 'true');
    localStorage.setItem('debug_task_persistence', 'true');
    localStorage.setItem('debug_task_state', 'true');
    
    console.log('[DEBUG_TESTER] Full Task Diagnostics Mode Enabled');
    
    // Show toast notification
    toast({
      title: "Full Task Diagnostics Enabled",
      description: "All diagnostic flags are now active",
      variant: "default",
    });
  };
  
  // Test logging and show confirmation
  const testLogging = () => {
    console.log('[DEBUG_TESTER] Log test message');
    
    if (taskCompletionDebug) {
      console.log('[DEBUG_TASK_COMPLETION] Test completion status monitoring');
    }
    
    if (taskPersistenceDebug) {
      console.log('[DEBUG_TASK_PERSISTENCE] Test persistence monitoring');
    }
    
    if (taskStateDebug) {
      console.log('[DEBUG_TASK_STATE] Test state transition monitoring');
    }
    
    // Show confirmation in UI
    setTestLogConfirmation(true);
    
    // Show toast notification
    toast({
      title: "Test Log Written",
      description: "Diagnostic messages sent to browser console",
      variant: "default",
    });
  };
  
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
      {/* Diagnostics Status Indicator */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Debug Controls</h3>
        <div className="flex items-center">
          <Badge 
            variant={isDiagnosticsActive ? "default" : "outline"}
            className={`px-3 py-1 flex items-center gap-1 ${isDiagnosticsActive ? 'bg-green-600' : 'text-gray-500'}`}
          >
            {isDiagnosticsActive ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Diagnostics ON</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Diagnostics OFF</span>
              </>
            )}
          </Badge>
        </div>
      </div>
      
      {/* Task Diagnostics Status */}
      {isDiagnosticsActive && (
        <div className="flex mb-4 flex-wrap gap-2">
          {taskDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              Tasks
            </Badge>
          )}
          {taskApiDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              API
            </Badge>
          )}
          {taskCompletionDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              Completion
            </Badge>
          )}
          {taskPersistenceDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              Persistence
            </Badge>
          )}
          {taskStateDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              State
            </Badge>
          )}
          {taskMappingDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              Mapping
            </Badge>
          )}
          {taskValidationDebug && (
            <Badge variant="secondary" className="px-2 py-0.5">
              Validation
            </Badge>
          )}
        </div>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Manage diagnostic logging for development and troubleshooting
      </p>
      
      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem value="debug-flags">
          <AccordionTrigger className="text-sm font-medium">
            Debug Flag Status
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {/* Primary Debug Flags */}
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="general-debug" className="w-32 text-sm">DEBUG:</Label>
                <Switch 
                  id="general-debug" 
                  checked={generalDebug} 
                  onCheckedChange={(checked) => {
                    setGeneralDebug(checked);
                    toggleDebugFlag('general', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-debug" className="w-32 text-sm">DEBUG_TASKS:</Label>
                <Switch 
                  id="task-debug" 
                  checked={taskDebug} 
                  onCheckedChange={(checked) => {
                    setTaskDebug(checked);
                    toggleDebugFlag('tasks', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="filter-debug" className="w-32 text-sm">DEBUG_FILTERS:</Label>
                <Switch 
                  id="filter-debug" 
                  checked={filterDebug} 
                  onCheckedChange={(checked) => {
                    setFilterDebug(checked);
                    toggleDebugFlag('filters', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="file-debug" className="w-32 text-sm">DEBUG_FILES:</Label>
                <Switch 
                  id="file-debug" 
                  checked={fileDebug} 
                  onCheckedChange={(checked) => {
                    setFileDebug(checked);
                    toggleDebugFlag('files', checked);
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="task-debug-flags">
          <AccordionTrigger className="text-sm font-medium">
            Task Debugging Controls
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {/* Granular Task Debug Flags */}
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-api-debug" className="text-xs sm:text-sm">
                  API Requests/Responses:
                </Label>
                <Switch 
                  id="task-api-debug" 
                  checked={taskApiDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskApiDebug(checked);
                    toggleDebugFlag('task_api', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-mapping-debug" className="text-xs sm:text-sm">
                  Data Transformations:
                </Label>
                <Switch 
                  id="task-mapping-debug" 
                  checked={taskMappingDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskMappingDebug(checked);
                    toggleDebugFlag('task_mapping', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-completion-debug" className="text-xs sm:text-sm">
                  Task Completion Status:
                </Label>
                <Switch 
                  id="task-completion-debug" 
                  checked={taskCompletionDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskCompletionDebug(checked);
                    toggleDebugFlag('task_completion', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-validation-debug" className="text-xs sm:text-sm">
                  Data Validation:
                </Label>
                <Switch 
                  id="task-validation-debug" 
                  checked={taskValidationDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskValidationDebug(checked);
                    toggleDebugFlag('task_validation', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-persistence-debug" className="text-xs sm:text-sm">
                  Storage/Persistence:
                </Label>
                <Switch 
                  id="task-persistence-debug" 
                  checked={taskPersistenceDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskPersistenceDebug(checked);
                    toggleDebugFlag('task_persistence', checked);
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between py-1">
                <Label htmlFor="task-state-debug" className="text-xs sm:text-sm">
                  State Transitions:
                </Label>
                <Switch 
                  id="task-state-debug" 
                  checked={taskStateDebug} 
                  disabled={!taskDebug}
                  onCheckedChange={(checked) => {
                    setTaskStateDebug(checked);
                    toggleDebugFlag('task_state', checked);
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button 
          variant="secondary" 
          size="sm"
          className="flex items-center gap-1"
          onClick={enableSuccessFactorDebugging}
        >
          <Bug className="h-4 w-4" />
          Track SuccessFactor Tasks
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className="flex items-center gap-1"
          onClick={enableTaskDiagnostics}
        >
          <CheckCircle className="h-4 w-4" />
          Enable Task Diagnostics
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className={testLogConfirmation ? "bg-green-100 text-green-800 border-green-300" : ""}
          onClick={testLogging}
        >
          {testLogConfirmation ? "✓ Log Written" : "Test Logging"}
        </Button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Note: Debug settings are now saved to localStorage and will persist across page reloads
      </div>
    </div>
  );
}