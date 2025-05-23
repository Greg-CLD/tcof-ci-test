import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Task Toggle Diagnostics
 * 
 * This component provides a diagnostic interface for tracing task toggle operations
 * It logs all stages of the process including:
 * - Original task data from API
 * - Task ID transformations
 * - PUT request details
 * - Server response
 */
export default function TaskToggleDiagnostics() {
  const [projectId, setProjectId] = useState('7277a5fe-899b-4fe6-8e35-05dd6103d054');
  const [logs, setLogs] = useState([]);
  const [successFactorTasks, setSuccessFactorTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const queryClient = useQueryClient();

  // Helper to add a log entry
  const addLog = (type, message, data) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    console.log(`[${type}] ${message}`, data);
    setLogs(prev => [logEntry, ...prev]);
  };

  // Function to clean task IDs (similar to what might be in the app)
  const cleanTaskId = (id) => {
    if (!id) return null;
    
    // If it has dashes, attempt to extract UUID part
    if (id.includes('-')) {
      const parts = id.split('-');
      // Standard UUID has 5 segments
      if (parts.length >= 5) {
        return parts.slice(0, 5).join('-');
      }
    }
    
    return id;
  };

  // Fetch tasks for the project
  const {
    data: tasks,
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    queryFn: async () => {
      addLog('FETCH_START', 'Fetching tasks from API');
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      addLog('FETCH_COMPLETE', 'Received tasks from API', { count: data.length });
      return data;
    },
    enabled: !!projectId
  });

  // Effect to extract Success Factor tasks
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Filter for success factor tasks
      const factorTasks = tasks.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      addLog('TASK_FILTER', 'Filtered for Success Factor tasks', {
        totalTasks: tasks.length,
        factorTasksCount: factorTasks.length
      });
      
      // Log detailed task information
      factorTasks.forEach(task => {
        addLog('TASK_DETAIL', `Task: ${task.text?.substring(0, 30)}...`, {
          id: task.id,
          originalId: task.originalId || 'N/A',
          sourceId: task.sourceId,
          origin: task.origin,
          completed: task.completed
        });
      });
      
      setSuccessFactorTasks(factorTasks);
    }
  }, [tasks]);

  // Setup mutation for toggling task completion
  const toggleMutation = useMutation({
    mutationFn: async (task) => {
      // 1. Log the original task data
      addLog('TOGGLE_START', 'Starting task toggle operation', {
        taskId: task.id,
        sourceId: task.sourceId,
        origin: task.origin,
        completed: task.completed
      });
      
      // 2. Clean the task ID (if needed) - log before/after
      const originalId = task.id;
      const cleanedId = cleanTaskId(task.id);
      
      addLog('ID_TRANSFORM', 'Task ID transformation', {
        originalId,
        cleanedId,
        unchanged: originalId === cleanedId
      });
      
      // 3. Prepare the update payload
      const newCompletionState = !task.completed;
      const updatePayload = { completed: newCompletionState };
      
      addLog('REQUEST_PREP', 'Preparing API request', {
        endpoint: `/api/projects/${projectId}/tasks/${cleanedId}`,
        method: 'PUT',
        payload: updatePayload
      });
      
      // 4. Make the API request
      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${cleanedId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });
        
        addLog('NETWORK_RESPONSE', `Server responded with status: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()])
        });
        
        // 5. Parse and log the response
        const responseData = await response.json();
        
        addLog('RESPONSE_DATA', 'Received response data', responseData);
        
        // Check if we got the expected format
        if (responseData.success && responseData.task) {
          addLog('TOGGLE_SUCCESS', 'Task toggle succeeded', {
            responseTaskId: responseData.task.id,
            responseTaskSourceId: responseData.task.sourceId,
            newCompletionState: responseData.task.completed,
            expectedState: newCompletionState,
            stateMatches: responseData.task.completed === newCompletionState
          });
        } else {
          addLog('TOGGLE_FAILURE', 'Task toggle failed - unexpected response format', responseData);
        }
        
        return responseData;
      } catch (error) {
        addLog('TOGGLE_ERROR', 'Error during toggle operation', {
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate tasks query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    }
  });

  // Handle task selection and toggle
  const handleToggleTask = (task) => {
    setSelectedTask(task);
    toggleMutation.mutate(task);
  };

  if (isLoading) return <div>Loading tasks...</div>;
  if (error) return <div>Error loading tasks: {error.message}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Task Toggle Diagnostics</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Project Selection</h2>
        <input 
          type="text" 
          value={projectId} 
          onChange={(e) => setProjectId(e.target.value)} 
          style={{ width: '400px', padding: '8px' }}
          placeholder="Enter project ID"
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Current project: {projectId}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>Success Factor Tasks</h2>
          {successFactorTasks.length === 0 ? (
            <div>No Success Factor tasks found for this project</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {successFactorTasks.map(task => (
                <div 
                  key={task.id}
                  style={{ 
                    padding: '10px', 
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: selectedTask?.id === task.id ? '#f0f0ff' : 'white'
                  }}
                >
                  <div style={{ marginBottom: '5px' }}>
                    <strong>{task.text}</strong> 
                    <span style={{ 
                      marginLeft: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: task.completed ? '#d4edda' : '#f8d7da',
                      color: task.completed ? '#155724' : '#721c24',
                      fontSize: '12px'
                    }}>
                      {task.completed ? 'Completed' : 'Not Completed'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>ID: {task.id}</div>
                    <div>Source ID: {task.sourceId || 'N/A'}</div>
                    <div>Origin: {task.origin}</div>
                  </div>
                  <button 
                    onClick={() => handleToggleTask(task)}
                    style={{ marginTop: '5px', padding: '4px 8px' }}
                    disabled={toggleMutation.isPending && selectedTask?.id === task.id}
                  >
                    {toggleMutation.isPending && selectedTask?.id === task.id 
                      ? 'Toggling...' 
                      : `Toggle to ${task.completed ? 'Not Completed' : 'Completed'}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>Task Operation Logs</h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {logs.length === 0 ? (
              <div>No logs yet. Toggle a task to see the operation flow.</div>
            ) : (
              logs.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    marginBottom: '10px', 
                    padding: '8px',
                    borderLeft: '4px solid',
                    borderColor: 
                      log.type.includes('ERROR') ? 'red' : 
                      log.type.includes('SUCCESS') ? 'green' : 
                      log.type.includes('FAILURE') ? 'orange' : 
                      '#007bff',
                    background: '#f8f9fa'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()} - {log.type}
                  </div>
                  <div style={{ marginBottom: '4px' }}>{log.message}</div>
                  {log.data && (
                    <pre style={{ 
                      fontSize: '12px', 
                      background: '#f0f0f0', 
                      padding: '4px',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>This diagnostic tool traces the entire task toggle operation flow from start to finish, recording task IDs, transformations, and API interactions.</p>
      </div>
    </div>
  );
}