import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, RefreshCw, Save } from 'lucide-react';
import { TaskPersistenceTester } from '@/components/TaskPersistenceTester';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TaskPersistenceTestPage: React.FC = () => {
  const [projectId, setProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch all projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    retry: false
  });
  
  // If projects are loaded, select the first one by default
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      setProjectId(projects[0].id);
    }
  }, [projects, selectedProject]);
  
  // Function to start testing with a given project ID
  const handleStartTesting = () => {
    if (!projectId) {
      toast({
        title: 'Project ID Required',
        description: 'Please enter or select a project ID',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedProject(projectId);
    toast({
      title: 'Testing Initialized',
      description: `Using project: ${projectId}`,
    });
  };
  
  // Function to select a project
  const handleSelectProject = (id: string) => {
    setProjectId(id);
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Task Persistence Testing</h1>
      
      {!selectedProject ? (
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Select Project for Testing
            </CardTitle>
            <CardDescription>
              Choose or enter a project ID to test task persistence
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter project ID"
              />
            </div>
            
            {projectsLoading ? (
              <div className="flex justify-center p-4">
                <Spinner className="h-6 w-6" />
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-2">
                <Label>Or select a project</Label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                  {projects.map((project: any) => (
                    <Button
                      key={project.id}
                      variant={projectId === project.id ? 'default' : 'outline'}
                      className="justify-start overflow-hidden"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="truncate">
                        <span className="font-medium">{project.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {project.id.substring(0, 8)}...
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ) : projects && projects.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Projects Found</AlertTitle>
                <AlertDescription>
                  You need to create a project before testing task persistence.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => refetchProjects()}
              disabled={projectsLoading}
            >
              {projectsLoading && <Spinner className="mr-2 h-4 w-4" />}
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Projects
            </Button>
            
            <Button 
              onClick={handleStartTesting}
              disabled={!projectId}
            >
              Start Testing
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Testing Project: <span className="font-mono text-sm">{selectedProject}</span>
            </h2>
            <Button 
              variant="outline" 
              onClick={() => setSelectedProject(null)}
            >
              Change Project
            </Button>
          </div>
          
          <TaskPersistenceTester projectId={selectedProject} />
        </div>
      )}
    </div>
  );
};

export default TaskPersistenceTestPage;