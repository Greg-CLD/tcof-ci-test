import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building, Plus, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SiteFooter from "@/components/SiteFooter";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface Organisation {
  id: string;
  name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
}

interface Heuristic {
  id: string;
  organisationId: string;
  name: string;
  value: string;
}

export default function OrganisationDashboardPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { orgId } = useParams<{ orgId: string }>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    description: ""
  });

  // Fetch organisation details
  const { 
    data: organisation, 
    isLoading: orgLoading, 
    error: orgError 
  } = useQuery({
    queryKey: [`/api/organisations/${orgId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organisations/${orgId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch organisation details");
      }
      return res.json();
    }
  });

  // Fetch projects for the organisation
  const { 
    data: projects = [], 
    isLoading: projLoading, 
    error: projError 
  } = useQuery({
    queryKey: [`/api/organisations/${orgId}/projects`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organisations/${orgId}/projects`);
      if (!res.ok) {
        throw new Error("Failed to fetch organisation projects");
      }
      return res.json();
    }
  });

  // Fetch organisation default heuristics
  const {
    data: heuristics = [],
    isLoading: heuristicsLoading,
    error: heuristicsError
  } = useQuery({
    queryKey: [`/api/organisations/${orgId}/heuristics`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organisations/${orgId}/heuristics`);
      if (!res.ok) {
        throw new Error("Failed to fetch organisation heuristics");
      }
      return res.json();
    }
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description: string | null; organisationId: string }) => {
      const res = await apiRequest("POST", "/api/projects", projectData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create project");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      setFormState({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      
      // Refetch projects and show success message
      queryClient.invalidateQueries({
        queryKey: [`/api/organisations/${orgId}/projects`]
      });
      
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle project creation
  const handleCreateProject = async () => {
    if (!formState.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return;
    }

    createProjectMutation.mutate({
      name: formState.name.trim(),
      description: formState.description.trim() || null,
      organisationId: orgId
    });
  };

  // Handle navigation to project
  const navigateToProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  // Handle navigation back to organisations list
  const navigateToOrganisations = () => {
    navigate("/organisations");
  };

  // Display error toasts if needed
  if (orgError) {
    toast({
      title: "Error",
      description: "Failed to fetch organisation details. Please try again.",
      variant: "destructive"
    });
  }

  if (projError) {
    toast({
      title: "Error",
      description: "Failed to fetch projects. Please try again.",
      variant: "destructive"
    });
  }

  if (heuristicsError) {
    toast({
      title: "Error",
      description: "Failed to fetch organisation heuristics. This may affect new projects.",
      variant: "destructive"
    });
  }

  const isLoading = orgLoading || projLoading || heuristicsLoading;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={navigateToOrganisations}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organisations
          </Button>
          
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-tcof-teal" />
              <h1 className="text-3xl font-bold text-tcof-dark">Loading organisation...</h1>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-tcof-dark">{organisation?.name}</h1>
                {organisation?.description && (
                  <p className="text-gray-600 mt-2">{organisation.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {(organisation?.role === 'owner' || organisation?.role === 'admin') && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/organisations/${orgId}/heuristics`)}
                  >
                    Manage Success Factors
                  </Button>
                )}
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-tcof-dark">Projects</h2>
          
          {projLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Building className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2 text-tcof-dark">No Projects Found</h3>
              <p className="text-gray-600 mb-6">This organisation doesn't have any projects yet. Create one to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project: Project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle 
                      className="cursor-pointer hover:text-tcof-teal transition-colors"
                      onClick={() => navigateToProject(project.id)}
                    >
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => navigateToProject(project.id)}
                    >
                      View Project
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Project Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formState.name} 
                  onChange={handleInputChange} 
                  placeholder="Enter project name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formState.description} 
                  onChange={handleInputChange} 
                  placeholder="Enter project description" 
                  rows={3}
                />
              </div>
              {heuristics.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    This project will use {heuristics.length} default heuristic values from this organisation.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending || !formState.name.trim()}
              >
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <SiteFooter />
    </div>
  );
}