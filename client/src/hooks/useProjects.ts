import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  userId: number;
  name: string;
  description?: string;
  sector?: string;
  orgType?: string;
  teamSize?: string;
  deliveryStage?: string;
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  const queryClient = useQueryClient();
  
  // Fetch all projects
  const {
    data: projects = [],
    isLoading,
    error,
    refetch
  } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    refetchOnWindowFocus: false,
  });

  // Create a new project
  const createProject = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string;
      sector?: string;
      orgType?: string;
      teamSize?: string;
      deliveryStage?: string;
    }) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: (newProject: Project) => {
      // Update the projects cache with the new project
      queryClient.setQueryData<Project[]>(['/api/projects'], (oldProjects = []) => {
        return [...oldProjects, newProject];
      });
      
      toast({
        title: 'Project Created',
        description: `"${newProject.name}" has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create project: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update an existing project
  const updateProject = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { 
        name?: string; 
        description?: string;
        sector?: string;
        orgType?: string;
        teamSize?: string;
        deliveryStage?: string;
      };
    }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      return response.json();
    },
    onSuccess: (updatedProject: Project) => {
      // Update the projects cache with the updated project
      queryClient.setQueryData<Project[]>(['/api/projects'], (oldProjects = []) => {
        return oldProjects.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
      });
      
      toast({
        title: 'Project Updated',
        description: `"${updatedProject.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update project: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    projects,
    isLoading,
    error,
    refetch,
    createProject,
    updateProject,
  };
}