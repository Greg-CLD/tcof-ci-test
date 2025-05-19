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
  DEBUG_TASK_PERSISTENCE
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

/**
 * Advanced Debug Flag Tester component
 * This component allows developers to view and toggle debug flags at runtime
 * Note: Toggling only affects the current browser session and will reset after page reload
 */
export default function DebugFlagTester() {
  // Runtime debug flag states
  const [generalDebug, setGeneralDebug] = useState(DEBUG);
  const [taskDebug, setTaskDebug] = useState(DEBUG_TASKS);
  const [filterDebug, setFilterDebug] = useState(DEBUG_FILTERS);
  const [fileDebug, setFileDebug] = useState(DEBUG_FILES);
  
  // Granular task-specific debug states
  const [taskApiDebug, setTaskApiDebug] = useState(DEBUG_TASK_API);
  const [taskMappingDebug, setTaskMappingDebug] = useState(DEBUG_TASK_MAPPING);
  const [taskCompletionDebug, setTaskCompletionDebug] = useState(DEBUG_TASK_COMPLETION);
  const [taskValidationDebug, setTaskValidationDebug] = useState(DEBUG_TASK_VALIDATION);
  const [taskPersistenceDebug, setTaskPersistenceDebug] = useState(DEBUG_TASK_PERSISTENCE);

  useEffect(() => {
    // Log current debug flag status
    console.log('[DEBUG_TESTER] Debug Flag Status:', {
      DEBUG,
      DEBUG_TASKS,
      DEBUG_FILTERS,
      DEBUG_FILES,
      DEBUG_TASK_API,
      DEBUG_TASK_MAPPING,
      DEBUG_TASK_COMPLETION,
      DEBUG_TASK_VALIDATION,
      DEBUG_TASK_PERSISTENCE
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
  }, [
    generalDebug, 
    taskDebug, 
    filterDebug, 
    fileDebug, 
    taskApiDebug, 
    taskMappingDebug,
    taskCompletionDebug,
    taskValidationDebug,
    taskPersistenceDebug
  ]);
  
  // Helper function to toggle debug flags in localStorage 
  const toggleDebugFlag = (flag, value) => {
    try {
      localStorage.setItem(`debug_${flag}`, value ? 'true' : 'false');
      console.log(`[DEBUG_TESTER] Set ${flag} to ${value}`);
      
      // Special case for general task debugging
      if (flag === 'tasks' && !value) {
        // If turning off general task debugging, also turn off all specific task flags
        setTaskApiDebug(false);
        setTaskMappingDebug(false);
        setTaskCompletionDebug(false);
        setTaskValidationDebug(false);
        setTaskPersistenceDebug(false);
        
        localStorage.setItem('debug_task_api', 'false');
        localStorage.setItem('debug_task_mapping', 'false');
        localStorage.setItem('debug_task_completion', 'false');
        localStorage.setItem('debug_task_validation', 'false');
        localStorage.setItem('debug_task_persistence', 'false');
      }
    } catch (e) {
      console.error('Error setting debug flag:', e);
    }
  };
  
  // Enable a special debug mode for SuccessFactor task debugging
  const enableSuccessFactorDebugging = () => {
    // Enable all task-related debugging focused on the SuccessFactor task completion bug
    setTaskDebug(true);
    setTaskApiDebug(true);
    setTaskCompletionDebug(true);
    setTaskPersistenceDebug(true);
    
    // Save to localStorage
    localStorage.setItem('debug_tasks', 'true');
    localStorage.setItem('debug_task_api', 'true');
    localStorage.setItem('debug_task_completion', 'true');
    localStorage.setItem('debug_task_persistence', 'true');
    
    console.log('[DEBUG_TESTER] SuccessFactor Task Debugging Mode Enabled');
    console.log('[DEBUG_TESTER] Ready to track task completion persistence issues');
  };
  
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
      <h3 className="text-lg font-medium mb-2">Debug Controls</h3>
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
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={enableSuccessFactorDebugging}
        >
          Track SuccessFactor Tasks
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            console.log('[DEBUG_TESTER] Log test message');
            if (taskCompletionDebug) {
              console.log('[DEBUG_TASK_COMPLETION] Test completion status monitoring');
            }
            if (taskPersistenceDebug) {
              console.log('[DEBUG_TASK_PERSISTENCE] Test persistence monitoring');
            }
          }}
        >
          Test Logging
        </Button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Note: Debug settings are simulated at runtime and will reset on page reload
      </div>
    </div>
  );
}