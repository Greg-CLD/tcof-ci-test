import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskPersistenceTest } from '@/components/TaskPersistenceTest';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

export default function TestPersistencePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  
  // If a project ID is provided in the URL, use it
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);
  
  // If no project ID is provided but we have projects, use the first one
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);
  
  // Get the selected project name
  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Persistence Test</CardTitle>
            <CardDescription>Loading projects...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!projects || projects.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Persistence Test</CardTitle>
            <CardDescription>No projects found</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please create a project first to test task persistence.</p>
            <Button asChild className="mt-4">
              <Link href="/all-projects">Go to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/all-projects">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Link>
        </Button>
      </div>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Task Persistence Test</CardTitle>
          <CardDescription>
            Testing task creation, update, and deletion for project:
            <span className="font-medium text-primary"> {selectedProject?.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            <p>This page allows you to test if task persistence is working correctly.</p>
            <ul className="list-disc list-inside mt-2">
              <li>Create a task with the "Create Task" button</li>
              <li>Update the created task with the "Update Task" button</li>
              <li>Delete the task with the "Delete Task" button</li>
              <li>Refresh the task list with the "Refresh Tasks" button</li>
            </ul>
          </div>
          
          {selectedProjectId && (
            <TaskPersistenceTest projectId={selectedProjectId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}