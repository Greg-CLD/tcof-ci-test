import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { StageType } from '@/components/task/EditableTaskPanel';

interface FrameworkTask {
  id: string;
  name: string;
  description: string;
}

interface Framework {
  tasks: FrameworkTask[];
  name?: string;
}

interface SavedTask {
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
  addedAt: string;
  text?: string;
}

interface FrameworksData {
  frameworks: Record<string, Framework>;
  savedTasks: SavedTask[];
}

interface TaskAssignment {
  projectId: string;
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
}

interface FrameworkTasksHook {
  frameworks: Record<string, Framework>;
  savedTasks: SavedTask[];
  selectedFrameworkCode: string | null;
  setSelectedFrameworkCode: (code: string | null) => void;
  formattedTasks: Record<StageType, any[]>;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: { taskId: string | null; status: 'saving' | 'saved' | null };
  handleSaveTask: (stage: StageType, taskId: string, text: string) => Promise<void>;
  handleToggleTaskInclusion: (stage: StageType, taskId: string) => Promise<void>;
  getFrameworkName: (code: string) => string;
}

// Framework name display mapping
const FRAMEWORK_NAMES: Record<string, string> = {
  praxis: 'Praxis Framework',
  green_book: 'UK Government Green Book',
  agilepm: 'Agile Project Management',
  safe: 'Scaled Agile Framework (SAFe)',
  custom: 'Custom Framework',
};

export function useFrameworkTasks(projectId?: string): FrameworkTasksHook {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFrameworkCode, setSelectedFrameworkCode] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ taskId: string | null; status: 'saving' | 'saved' | null }>({ 
    taskId: null,
    status: null
  });

  // Fetch framework tasks for this project
  const { data: frameworksData, isLoading } = useQuery({
    queryKey: ['project-framework-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/projects/${projectId}/framework-tasks`);
      if (!res.ok) {
        if (res.status !== 404) {
          toast({
            title: "Error loading framework tasks",
            description: "Could not load tasks for selected frameworks",
            variant: "destructive",
          });
        }
        return null;
      }
      return res.json() as Promise<FrameworksData>;
    },
    enabled: !!projectId,
  });

  // Mutation for saving framework task assignments
  const saveTaskMutation = useMutation({
    mutationFn: async ({ projectId, taskId, frameworkCode, stage, included }: TaskAssignment) => {
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/framework-tasks`,
        { 
          taskId,
          frameworkCode,
          stage,
          included
        }
      );
      
      if (!res.ok) {
        throw new Error("Failed to save task assignment");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-framework-tasks', projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error saving task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Format tasks for the EditableTaskPanel component
  const formattedTasks = {
    Identification: [] as any[],
    Definition: [] as any[],
    Delivery: [] as any[],
    Closure: [] as any[],
  };

  // If a framework is selected, populate formattedTasks with its tasks
  if (frameworksData && selectedFrameworkCode) {
    const framework = frameworksData.frameworks[selectedFrameworkCode];
    if (framework) {
      // Add all framework tasks to the formatted structure
      framework.tasks.forEach(task => {
        // Check if this task is already saved
        const savedTask = frameworksData.savedTasks.find(
          st => st.taskId === task.id && st.frameworkCode === selectedFrameworkCode
        );
        
        // Default to Identification stage if not saved
        const stage = savedTask?.stage || 'Identification';
        
        // Only add if it's included (or not saved yet)
        if (!savedTask || savedTask.included) {
          formattedTasks[stage as StageType].push({
            id: task.id,
            text: task.name, // Use name as text
            description: task.description,
            stage: stage,
            completed: false,
            origin: 'framework',
            sourceId: selectedFrameworkCode,
            included: savedTask ? savedTask.included : false
          });
        }
      });
    }
  }

  // Helper to check if a task is included in the checklist
  const isTaskIncluded = (taskId: string, frameworkCode: string): boolean => {
    if (!frameworksData?.savedTasks) return false;
    
    const savedTask = frameworksData.savedTasks.find(
      task => task.taskId === taskId && task.frameworkCode === frameworkCode
    );
    
    return savedTask ? savedTask.included : false;
  };

  // Helper to get task stage
  const getTaskStage = (taskId: string, frameworkCode: string): string => {
    if (!frameworksData?.savedTasks) return 'Identification';
    
    const savedTask = frameworksData.savedTasks.find(
      task => task.taskId === taskId && task.frameworkCode === frameworkCode
    );
    
    return savedTask ? savedTask.stage : 'Identification';
  };

  // Handle saving task stage and text (name remains the same)
  const handleSaveTask = async (stage: StageType, taskId: string, text: string) => {
    if (!projectId || !selectedFrameworkCode) return;
    
    setSaveStatus({ taskId, status: 'saving' });
    
    try {
      await saveTaskMutation.mutateAsync({
        projectId,
        taskId,
        frameworkCode: selectedFrameworkCode,
        stage,
        included: isTaskIncluded(taskId, selectedFrameworkCode)
      });
      
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

  // Handle toggling task inclusion
  const handleToggleTaskInclusion = async (stage: StageType, taskId: string) => {
    if (!projectId || !selectedFrameworkCode) return;
    
    setSaveStatus({ taskId, status: 'saving' });
    
    try {
      const currentlyIncluded = isTaskIncluded(taskId, selectedFrameworkCode);
      
      await saveTaskMutation.mutateAsync({
        projectId,
        taskId,
        frameworkCode: selectedFrameworkCode,
        stage,
        included: !currentlyIncluded
      });
      
      setSaveStatus({ taskId, status: 'saved' });
      // Clear saved indicator after delay
      setTimeout(() => {
        setSaveStatus({ taskId: null, status: null });
      }, 1500);
    } catch (error) {
      console.error('Error toggling task inclusion:', error);
      setSaveStatus({ taskId: null, status: null });
    }
  };

  // Helper to get framework name
  const getFrameworkName = (code: string): string => {
    return FRAMEWORK_NAMES[code] || code;
  };

  // Set the first framework as selected if none is selected and data is loaded
  useEffect(() => {
    if (frameworksData && !selectedFrameworkCode) {
      const frameworkCodes = Object.keys(frameworksData.frameworks);
      if (frameworkCodes.length > 0) {
        setSelectedFrameworkCode(frameworkCodes[0]);
      }
    }
  }, [frameworksData, selectedFrameworkCode]);

  return {
    frameworks: frameworksData?.frameworks || {},
    savedTasks: frameworksData?.savedTasks || [],
    selectedFrameworkCode,
    setSelectedFrameworkCode,
    formattedTasks,
    isLoading,
    isSaving: saveTaskMutation.isPending,
    saveStatus,
    handleSaveTask,
    handleToggleTaskInclusion,
    getFrameworkName
  };
}