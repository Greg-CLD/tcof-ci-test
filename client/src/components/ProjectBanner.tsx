import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useProjects, Project } from '@/hooks/useProjects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, ChevronDown } from 'lucide-react';

export default function ProjectBanner() {
  const [location, navigate] = useLocation();
  const { projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load the selected project ID from localStorage on mount
  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setSelectedProjectId(storedProjectId);
    }
  }, []);

  // Update current project when projects or selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setCurrentProject(project);
      } else {
        // If the selected project is not found in the projects list,
        // clear the selection and localStorage
        setCurrentProject(null);
        setSelectedProjectId(null);
        localStorage.removeItem('selectedProjectId');
      }
    } else {
      setCurrentProject(null);
    }
  }, [selectedProjectId, projects]);

  // Handle project change
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    
    // Redirect to appropriate page if needed
    // For now, just stay on the current page
  };

  // Handle new project button click
  const handleNewProject = () => {
    navigate('/get-your-bearings/project-profile');
  };

  if (isLoading) {
    return (
      <div className="bg-tcof-light border-b border-gray-200 py-2 px-4">
        <div className="container mx-auto">
          <div className="h-8 flex items-center text-gray-500">
            Loading projects...
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="bg-tcof-light border-b border-gray-200 py-2 px-4">
        <div className="container mx-auto">
          <div className="h-8 flex items-center justify-between">
            <div className="text-gray-500 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              No project selected
            </div>
            <button 
              onClick={handleNewProject}
              className="text-sm text-tcof-teal hover:text-tcof-teal/80 font-medium"
            >
              Create New Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-tcof-light border-b border-gray-200 py-2 px-4">
      <div className="container mx-auto">
        <div className="h-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-tcof-teal" />
            <span className="font-medium">Working on:</span>
            
            <Select value={selectedProjectId || ''} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-7 border-none shadow-none px-2 w-auto min-w-[180px] bg-transparent hover:bg-gray-100 transition-colors">
                <SelectValue className="truncate font-medium text-tcof-dark">
                  {currentProject?.name || 'Select a project'}
                </SelectValue>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
                <div className="px-2 py-2 border-t border-gray-100 mt-1">
                  <button
                    onClick={handleNewProject}
                    className="w-full text-left text-sm text-tcof-teal hover:text-tcof-teal/80 font-medium"
                  >
                    + Create New Project
                  </button>
                </div>
              </SelectContent>
            </Select>
          </div>
          
          {currentProject && (
            <div className="text-xs text-gray-500">
              {currentProject.sector} • {currentProject.deliveryStage} stage
            </div>
          )}
        </div>
      </div>
    </div>
  );
}