import { useState, useEffect } from 'react';
import { useProjectTasks } from './useProjectTasks';
import { useProjectPolicies } from './useProjectPolicies';
import { StageType } from '@/components/task/EditableTaskPanel';
import { v4 as uuidv4 } from 'uuid';

interface PolicyTasksHook {
  policies: Array<{ id: string; name: string }>;
  selectedPolicyId: string | null;
  setSelectedPolicyId: (id: string | null) => void;
  formattedTasks: Record<StageType, any[]>;
  isLoading: boolean;
  isSaving: boolean;
  isPolicySaving: boolean;
  saveStatus: { taskId: string | null; status: 'saving' | 'saved' | null };
  handleSaveTask: (stage: StageType, taskId: string, text: string) => Promise<void>;
  handleAddTask: (stage: StageType) => Promise<void>;
  handleDeleteTask: (stage: StageType, taskId: string) => Promise<void>;
  newPolicyName: string;
  setNewPolicyName: (name: string) => void;
  createPolicy: (name: string) => Promise<void>;
  updatePolicy: (id: string, name: string) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
}

export function usePolicyTasks(projectId?: string): PolicyTasksHook {
  const { 
    policies, 
    isLoading: loadingPolicies, 
    createPolicy,
    updatePolicy,
    deletePolicy,
    newPolicyName,
    setNewPolicyName,
    isSaving: isPolicySaving 
  } = useProjectPolicies(projectId);
  
  const {
    tasks,
    isLoading: loadingTasks,
    createTask,
    updateTask,
    deleteTask,
    isCreating,
    isUpdating,
    isDeleting,
  } = useProjectTasks(projectId);

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ taskId: string | null; status: 'saving' | 'saved' | null }>({ 
    taskId: null,
    status: null
  });

  // Format tasks for the EditableTaskPanel component
  const formattedTasks = {
    Identification: [] as any[],
    Definition: [] as any[],
    Delivery: [] as any[],
    Closure: [] as any[],
  };

  // Populate tasks for the selected policy
  if (tasks && selectedPolicyId) {
    const policyTasks = tasks.filter(
      task => task.sourceId === selectedPolicyId && task.origin === 'policy'
    );

    policyTasks.forEach(task => {
      if (task.stage in formattedTasks) {
        formattedTasks[task.stage as StageType].push({
          id: task.id,
          text: task.text,
          stage: task.stage,
          completed: task.completed,
          origin: 'policy',
          sourceId: selectedPolicyId
        });
      }
    });
  }

  const handleSaveTask = async (stage: StageType, taskId: string, text: string) => {
    if (!text.trim() || !selectedPolicyId || !projectId) return;
    
    setSaveStatus({ taskId, status: 'saving' });
    
    try {
      // Find if this is a new temporary ID or an existing one
      const isNewTask = tasks ? !tasks.some(t => t.id === taskId) : true;
      
      if (isNewTask) {
        // This is a new task with a temporary ID, create it
        await createTask({
          projectId: projectId,
          text,
          stage: stage.toLowerCase() as 'identification' | 'definition' | 'delivery' | 'closure',
          origin: 'policy',
          sourceId: selectedPolicyId,
        });
      } else {
        // This is an existing task, update it
        await updateTask(taskId, { text });
      }
      
      setSaveStatus({ taskId, status: 'saved' });
      // Clear saved indicator after delay
      setTimeout(() => {
        setSaveStatus({ taskId: null, status: null });
      }, 1500);
    } catch (error) {
      console.error('Error saving task:', error);
      setSaveStatus({ taskId: null, status: null });
    }
  };

  const handleAddTask = async (stage: StageType) => {
    if (!selectedPolicyId || !projectId) return;
    
    // Check if we already have 3 tasks for this stage
    const tasksInStage = formattedTasks[stage].length;
    if (tasksInStage >= 3) return;
    
    // Create a temporary ID for the UI
    const tempId = uuidv4();
    
    // Add an empty task to the UI with a temporary ID
    formattedTasks[stage].push({
      id: tempId,
      text: '',
      stage,
      completed: false,
      origin: 'policy',
      sourceId: selectedPolicyId
    });
    
    // Set this task as saving
    setSaveStatus({ taskId: tempId, status: 'saving' });
    
    try {
      // Create the task in the backend
      await createTask({
        projectId: projectId,
        text: '',
        stage: stage.toLowerCase() as 'identification' | 'definition' | 'delivery' | 'closure',
        origin: 'policy',
        sourceId: selectedPolicyId,
      });
      
      // Update status
      setSaveStatus({ taskId: tempId, status: 'saved' });
      // Clear saved indicator after delay
      setTimeout(() => {
        setSaveStatus({ taskId: null, status: null });
      }, 1500);
    } catch (error) {
      console.error('Error adding task:', error);
      setSaveStatus({ taskId: null, status: null });
    }
  };

  const handleDeleteTask = async (stage: StageType, taskId: string) => {
    if (!taskId) return;
    
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return {
    policies: policies || [],
    selectedPolicyId,
    setSelectedPolicyId,
    formattedTasks,
    isLoading: loadingPolicies || loadingTasks,
    isSaving: isCreating || isUpdating || isDeleting,
    isPolicySaving,
    saveStatus,
    handleSaveTask,
    handleAddTask,
    handleDeleteTask,
    newPolicyName,
    setNewPolicyName,
    createPolicy,
    updatePolicy,
    deletePolicy
  };
}