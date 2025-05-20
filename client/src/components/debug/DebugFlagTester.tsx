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
import { 
  AlertCircle, 
  CheckCircle, 
  Bug, 
  Terminal 
} from "lucide-react";

/**
 * Debug Flag Tester component
 * This component allows toggling of debug flags at runtime
 * Settings are saved to localStorage and persist across page reloads
 */
export default function DebugFlagTester() {
  const { toast } = useToast();
  
  // Get initial states from localStorage first, then fall back to global constants
  const getInitialState = (key: string, defaultValue: boolean): boolean => {
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
  
  // Additional state for UI controls
  const [testLogConfirmation, setTestLogConfirmation] = useState(false);

  // Compute overall diagnostics status
  const isDiagnosticsActive = generalDebug || taskDebug || filterDebug || fileDebug;

  // Log diagnostics status when flags change
  useEffect(() => {
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
  
  // Define debug utility functions (will be populated from window when available)
  let enableTaskDebugFn: () => void;
  let disableTaskDebugFn: () => void;
  
  // Initialize the functions if we're in a browser environment
  if (typeof window !== 'undefined') {
    // These functions will be available after the enableDebugLogging module is loaded
    enableTaskDebugFn = () => {
      if ((window as any).enableAllTaskDebugging) {
        (window as any).enableAllTaskDebugging();
      } else {
        // Fallback if the function isn't available
        console.log('[DEBUG] Manually enabling debug flags via localStorage');
        localStorage.setItem('debug_general', 'true');
        localStorage.setItem('debug_tasks', 'true');
        localStorage.setItem('debug_task_api', 'true');
        localStorage.setItem('debug_task_completion', 'true');
        localStorage.setItem('debug_task_persistence', 'true');
        localStorage.setItem('debug_task_state', 'true');
      }
    };
    
    // Define the missing enableSuccessFactorDebugging function
    (window as any).enableSuccessFactorDebugging = function() {
      localStorage.setItem('debug_tasks', 'true');
      localStorage.setItem('debug_task_completion', 'true');
      localStorage.setItem('debug_task_persistence', 'true');
      localStorage.setItem('debug_task_api', 'true');
      toast({ title: 'SuccessFactor Debugging Enabled' });
      window.location.reload();
    };
    
    disableTaskDebugFn = () => {
      if ((window as any).disableAllDebugging) {
        (window as any).disableAllDebugging();
      } else {
        // Fallback
        console.log('[INFO] Manually disabling debug flags via localStorage');
        localStorage.setItem('debug_general', 'false');
        localStorage.setItem('debug_tasks', 'false');
        localStorage.setItem('debug_task_api', 'false');
        localStorage.setItem('debug_task_completion', 'false');
        localStorage.setItem('debug_task_persistence', 'false');
        localStorage.setItem('debug_task_state', 'false');
      }
    };
  }

  // Master toggle for all diagnostics
  const toggleAllDiagnostics = (enabled: boolean) => {
    // Set all flags to the specified value
    setGeneralDebug(enabled);
    setTaskDebug(enabled);
    
    if (enabled) {
      // Only set task-specific flags when enabling
      setTaskApiDebug(true);
      setTaskCompletionDebug(true);
      setTaskPersistenceDebug(true);
      setTaskStateDebug(true);
      
      // Use the utility function to ensure flags are properly set
      if (typeof enableAllTaskDebugging === 'function') {
        enableAllTaskDebugging();
      } else {
        // Fallback if the function isn't available yet
        localStorage.setItem('debug_general', 'true');
        localStorage.setItem('debug_tasks', 'true');
        localStorage.setItem('debug_task_api', 'true');
        localStorage.setItem('debug_task_completion', 'true');
        localStorage.setItem('debug_task_persistence', 'true');
        localStorage.setItem('debug_task_state', 'true');
      }
    } else {
      // Turn off all task-specific flags when disabling
      setTaskApiDebug(false);
      setTaskMappingDebug(false);
      setTaskCompletionDebug(false);
      setTaskValidationDebug(false);
      setTaskPersistenceDebug(false);
      setTaskStateDebug(false);
      
      // Use the utility function to ensure flags are properly cleared
      if (typeof disableAllDebugging === 'function') {
        disableAllDebugging();
      } else {
        // Fallback if the function isn't available yet
        localStorage.setItem('debug_general', 'false');
        localStorage.setItem('debug_tasks', 'false');
        localStorage.setItem('debug_filters', 'false');
        localStorage.setItem('debug_files', 'false');
        localStorage.setItem('debug_task_api', 'false');
        localStorage.setItem('debug_task_mapping', 'false');
        localStorage.setItem('debug_task_completion', 'false');
        localStorage.setItem('debug_task_validation', 'false');
        localStorage.setItem('debug_task_persistence', 'false');
        localStorage.setItem('debug_task_state', 'false');
      }
    }
    
    // Show notifications
    toast({
      title: enabled ? "Diagnostics Enabled" : "Diagnostics Disabled",
      description: enabled 
        ? "Diagnostic logging is now active - results visible in browser console" 
        : "All diagnostic logging has been turned off",
      variant: enabled ? "default" : "info",
    });
    
    console.log(`[DEBUG_TESTER] ${enabled ? 'Enabled' : 'Disabled'} all diagnostic flags`);
    
    // Force a browser refresh to ensure debug flags take effect
    if (enabled) {
      console.log('[DEBUG_TESTER] Refreshing page to enable debug flags...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };
  
  // Helper function to toggle individual debug flags
  const toggleDebugFlag = (flag: string, value: boolean) => {
    try {
      localStorage.setItem(`debug_${flag}`, value ? 'true' : 'false');
      console.log(`[DEBUG_TESTER] Set ${flag} to ${value}`);
      
      // Show toast notification
      toast({
        title: value ? "Diagnostics Enabled" : "Diagnostics Disabled",
        description: `${flag.charAt(0).toUpperCase() + flag.slice(1)} debugging is now ${value ? 'active' : 'inactive'}`,
        variant: value ? "default" : "info",
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
  
  // Enable special SuccessFactor task debugging preset
  const enableFactorTaskDebugging = () => {
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
    
    // Use the global function if available
    if (typeof window !== 'undefined' && (window as any).enableSuccessFactorDebugging) {
      (window as any).enableSuccessFactorDebugging();
    }
    
    console.log('[DEBUG_TESTER] SuccessFactor Task Debugging Mode Enabled');
    
    // Show toast notification
    toast({
      title: "SuccessFactor Task Debugging Enabled",
      description: "Logging activated for critical task operations",
      variant: "default",
    });
    
    // Force a browser refresh to ensure debug flags take effect
    console.log('[DEBUG_TESTER] Refreshing page to enable debug flags...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
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
      {/* Main Diagnostics Control Panel */}
      <div className="flex flex-col gap-3">
        {/* Header with main toggle */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Diagnostics</h3>
          
          <div className="flex items-center gap-3">
            <Switch
              id="master-diagnostics-toggle"
              checked={isDiagnosticsActive}
              onCheckedChange={toggleAllDiagnostics}
              className="data-[state=checked]:bg-green-600"
            />
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
        
        {/* Simple Numbered Help Text */}
        <div className="text-sm text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600 pl-3 py-1">
          <ol className="list-decimal list-inside space-y-1">
            <li>Toggle ON to start logging</li>
            <li>Reproduce the issue</li>
            <li>Check browser console (F12). Toggle OFF when done</li>
          </ol>
        </div>
        
        {/* Active flags - only show when diagnostics are active */}
        {isDiagnosticsActive && (
          <div className="flex flex-wrap gap-2 mb-1 mt-1">
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
          </div>
        )}
        
        {/* Advanced Controls - only visible when diagnostics are active */}
        {isDiagnosticsActive && (
          <Accordion type="single" collapsible className="mb-0 mt-1">
            <AccordionItem value="advanced-controls">
              <AccordionTrigger className="text-sm font-medium py-1 hover:no-underline">
                Advanced Controls
              </AccordionTrigger>
              <AccordionContent>
                {/* Special Action Buttons */}
                <div className="flex gap-2 mb-3 mt-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={testLogConfirmation ? "bg-green-100 text-green-800 border-green-300" : ""}
                    onClick={testLogging}
                  >
                    <Terminal className="h-3.5 w-3.5 mr-1" />
                    {testLogConfirmation ? "✓ Log Written" : "Test Logging"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={enableSuccessFactorDebugging}
                  >
                    <Bug className="h-3.5 w-3.5 mr-1" />
                    Debug SuccessFactor Tasks
                  </Button>
                </div>
                
                <div className="space-y-2 pt-1">
                  {/* Primary Debug Flags */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between py-1">
                      <Label htmlFor="general-debug" className="text-sm">DEBUG:</Label>
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
                      <Label htmlFor="task-debug" className="text-sm">TASKS:</Label>
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
                      <Label htmlFor="filter-debug" className="text-sm">FILTERS:</Label>
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
                      <Label htmlFor="file-debug" className="text-sm">FILES:</Label>
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
                  
                  {/* Task-specific Debug Flags - Only shown when task debugging is enabled */}
                  {taskDebug && (
                    <>
                      <div className="bg-gray-200/50 dark:bg-gray-700/50 p-2 rounded-md mt-2">
                        <h4 className="text-sm font-medium mb-2">Task-Specific Diagnostics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-api-debug" className="text-xs sm:text-sm">
                              API:
                            </Label>
                            <Switch 
                              id="task-api-debug" 
                              checked={taskApiDebug} 
                              onCheckedChange={(checked) => {
                                setTaskApiDebug(checked);
                                toggleDebugFlag('task_api', checked);
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-mapping-debug" className="text-xs sm:text-sm">
                              Mapping:
                            </Label>
                            <Switch 
                              id="task-mapping-debug" 
                              checked={taskMappingDebug} 
                              onCheckedChange={(checked) => {
                                setTaskMappingDebug(checked);
                                toggleDebugFlag('task_mapping', checked);
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-completion-debug" className="text-xs sm:text-sm">
                              Completion:
                            </Label>
                            <Switch 
                              id="task-completion-debug" 
                              checked={taskCompletionDebug} 
                              onCheckedChange={(checked) => {
                                setTaskCompletionDebug(checked);
                                toggleDebugFlag('task_completion', checked);
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-validation-debug" className="text-xs sm:text-sm">
                              Validation:
                            </Label>
                            <Switch 
                              id="task-validation-debug" 
                              checked={taskValidationDebug} 
                              onCheckedChange={(checked) => {
                                setTaskValidationDebug(checked);
                                toggleDebugFlag('task_validation', checked);
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-persistence-debug" className="text-xs sm:text-sm">
                              Persistence:
                            </Label>
                            <Switch 
                              id="task-persistence-debug" 
                              checked={taskPersistenceDebug} 
                              onCheckedChange={(checked) => {
                                setTaskPersistenceDebug(checked);
                                toggleDebugFlag('task_persistence', checked);
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between py-1">
                            <Label htmlFor="task-state-debug" className="text-xs sm:text-sm">
                              State:
                            </Label>
                            <Switch 
                              id="task-state-debug" 
                              checked={taskStateDebug} 
                              onCheckedChange={(checked) => {
                                setTaskStateDebug(checked);
                                toggleDebugFlag('task_state', checked);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
      
      {/* Footer note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Settings are saved and will persist across page reloads
      </div>
    </div>
  );
}