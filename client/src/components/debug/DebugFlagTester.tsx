import React, { useEffect } from 'react';
import { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } from '@shared/constants.debug';

/**
 * Component to test the debug flag system in a browser environment
 * This component will log the current status of all debug flags to the console
 */
export default function DebugFlagTester() {
  useEffect(() => {
    // Log the status of all debug flags when component mounts
    console.log('Debug Flag Status:', {
      DEBUG,
      DEBUG_TASKS,
      DEBUG_FILTERS,
      DEBUG_FILES
    });
    
    // Test each debug flag individually
    if (DEBUG) {
      console.log('[DEBUG] General debug mode is enabled');
    }
    
    if (DEBUG_TASKS) {
      console.log('[DEBUG_TASKS] Task debugging is enabled');
    }
    
    if (DEBUG_FILTERS) {
      console.log('[DEBUG_FILTERS] Filter debugging is enabled');
    }
    
    if (DEBUG_FILES) {
      console.log('[DEBUG_FILES] File operation debugging is enabled');
    }
  }, []);
  
  return (
    <div className="p-4 bg-gray-100 rounded-md mb-4">
      <h3 className="text-lg font-medium mb-2">Debug Flag Tester</h3>
      <p className="text-sm text-gray-600 mb-2">Check the console for debug flag status</p>
      <div className="text-xs space-y-1">
        <div className="flex items-center">
          <span className="w-32">DEBUG:</span>
          <span className={DEBUG ? "text-green-600" : "text-red-600"}>
            {DEBUG ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-32">DEBUG_TASKS:</span>
          <span className={DEBUG_TASKS ? "text-green-600" : "text-red-600"}>
            {DEBUG_TASKS ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-32">DEBUG_FILTERS:</span>
          <span className={DEBUG_FILTERS ? "text-green-600" : "text-red-600"}>
            {DEBUG_FILTERS ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center">
          <span className="w-32">DEBUG_FILES:</span>
          <span className={DEBUG_FILES ? "text-green-600" : "text-red-600"}>
            {DEBUG_FILES ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}