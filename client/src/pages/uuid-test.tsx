import { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '@/contexts/ProjectContext';
import UUIDTaskTest from '@/components/UUIDTaskTest';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { generateUuid } from '@/lib/uuid-utils';

/**
 * Test page for UUID utilities implementation
 * The page also helps with testing task persistence
 */
export default function UUIDTestPage() {
  const { currentProjectId, selectProject } = useContext(ProjectContext);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Fetch available projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await apiRequest('GET', '/api/projects');
        const projectsData = await response.json();
        
        if (Array.isArray(projectsData)) {
          setProjects(projectsData);
          
          // Auto-select the first project if none is selected
          if (projectsData.length > 0 && (!currentProjectId || currentProjectId === '00000000-000b-4000-8000-000000000000')) {
            selectProject(projectsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch projects. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjects();
  }, [currentProjectId, selectProject, toast]);
  
  // Create a test project if none exists
  const createTestProject = async () => {
    try {
      // Generate a UUID for the project
      const projectId = generateUuid();
      
      // Create the project
      const response = await apiRequest('POST', '/api/projects', {
        id: projectId,
        name: `UUID Test Project ${new Date().toLocaleString()}`,
        description: 'Test project for UUID utilities',
        organisationId: null,
      });
      
      if (response.ok) {
        const newProject = await response.json();
        
        // Update projects list
        setProjects(prev => [...prev, newProject]);
        
        // Select the new project
        selectProject(newProject.id);
        
        toast({
          title: 'Success',
          description: `Created test project: ${newProject.name}`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create test project',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating test project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test project. See console for details.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container max-w-6xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">UUID Utilities Test</h1>
        <p className="text-gray-600 mb-6">
          This page tests the UUID utility functions and task persistence using the new UUID conversion system.
        </p>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">Current Project</h2>
          {loading ? (
            <div className="animate-pulse">Loading projects...</div>
          ) : currentProjectId && currentProjectId !== '00000000-000b-4000-8000-000000000000' ? (
            <div>
              <p>Using project: <strong>{projects.find(p => p.id === currentProjectId)?.name || currentProjectId}</strong></p>
              <p className="text-sm text-gray-500">ID: {currentProjectId}</p>
            </div>
          ) : (
            <div className="text-red-600">
              No project selected. Please create a test project or select one from the projects list.
            </div>
          )}
          
          <div className="mt-4 flex space-x-4">
            <Button onClick={createTestProject}>Create Test Project</Button>
            
            <div className="relative">
              <select
                className="form-select block w-full pl-3 pr-10 py-2 text-base leading-6 border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm sm:leading-5 rounded-md bg-white"
                value={currentProjectId || ''}
                onChange={(e) => selectProject(e.target.value)}
                disabled={loading || projects.length === 0}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {currentProjectId && currentProjectId !== '00000000-000b-4000-8000-000000000000' ? (
        <UUIDTaskTest projectId={currentProjectId} />
      ) : (
        <div className="p-8 text-center bg-gray-100 border border-gray-200 rounded-md">
          <p className="text-lg">Please select a project to test UUID task persistence.</p>
        </div>
      )}
    </div>
  );
}