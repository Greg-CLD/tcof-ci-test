import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useToast } from "@/hooks/use-toast";
import { 
  Clipboard, ClipboardCheck, FileDown, PlusCircle, Calendar, 
  Trash2, ArrowRight, FolderOpen, RefreshCcw, Clock, Edit
} from "lucide-react";
import { getAllPlanSummaries, setLatestPlanId, quickStartPlan } from "@/lib/planHelpers";
import { createEmptyPlan } from "@/lib/plan-db";
import { formatDistanceToNow } from "date-fns";
import { generateCompletePDF } from "@/lib/pdf-utils";
import vitruvianMan from "../assets/vitruvian-man.png";

// Project interface
interface ProjectSummary {
  id: string;
  name?: string;
  created: string;
  lastUpdated?: string;
}

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // Function to load projects
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching projects for dashboard...");
      const projectsList = await getAllPlanSummaries();
      console.log(`Loaded ${projectsList.length} projects for dashboard`);
      setProjects(projectsList);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load your projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load projects on component mount or when location changes
  useEffect(() => {
    // This ensures we reload the project list when the user navigates back to the dashboard
    loadProjects();
  }, [location, toast]);

  // Handle creating a new project
  const handleCreateProject = async () => {
    try {
      // Validate
      if (!newProjectName.trim()) {
        toast({
          title: "Missing Information",
          description: "Please provide a project name",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Creating Project",
        description: "Please wait while we set up your new project...",
      });

      // Create new project
      const projectId = await createEmptyPlan(
        newProjectName.trim(),
        newProjectDescription.trim()
      );

      // Set as current project
      setLatestPlanId(projectId);

      // Refresh project list
      const updatedProjects = await getAllPlanSummaries();
      setProjects(updatedProjects);

      // Close dialog and clear form
      setCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");

      // Show success toast
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully!",
      });

      // Navigate to make-a-plan landing
      navigate("/make-a-plan");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Start a new project with Quick Start
  const handleQuickStart = async () => {
    try {
      // Show loading toast
      toast({
        title: "Creating Quick Start Project",
        description: "Please wait while we set up your project...",
      });

      // Create a quick start project (with default success factor tasks)
      const projectId = await quickStartPlan();

      // Refresh project list
      const updatedProjects = await getAllPlanSummaries();
      setProjects(updatedProjects);

      // Show success toast
      toast({
        title: "Quick Start Project Created",
        description: "Your project has been created with default tasks!",
      });

      // Navigate to make-a-plan landing
      navigate("/make-a-plan");
    } catch (error) {
      console.error("Error with quick start:", error);
      toast({
        title: "Error",
        description: "Failed to create quick start project. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle continuing an existing project
  const handleContinueProject = (projectId: string) => {
    // Set as current project
    setLatestPlanId(projectId);

    // Navigate to make-a-plan landing
    navigate("/make-a-plan");
  };

  // Handle deleting a project
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    // TODO: Implement project deletion
    // This will be implemented in a future update

    setDeleteDialogOpen(false);
    setProjectToDelete(null);
    
    toast({
      title: "Project Deletion",
      description: "Project deletion is coming soon in a future update",
    });
  };

  // Handle generating a PDF export (for current project)
  const handleGeneratePDF = async (projectId: string) => {
    // Set as current project
    setLatestPlanId(projectId);

    // TODO: Navigate to PDF export or generate directly
    toast({
      title: "PDF Export",
      description: "PDF export for projects is coming soon",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-tcof-light text-tcof-dark">
      <SiteHeader />
      
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-white to-tcof-light py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-tcof-dark">
            Project Dashboard
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mb-6">
            Manage your transformation and change initiatives. Create new projects or continue working on 
            existing ones to deliver successful outcomes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> New Project
            </Button>
            <Button 
              onClick={handleQuickStart}
              variant="outline" 
              className="border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Quick Start
            </Button>
          </div>
        </div>
      </header>

      {/* Projects Section */}
      <section className="py-12 bg-white flex-1">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-tcof-dark flex items-center">
              <Clipboard className="mr-2 h-6 w-6 text-tcof-teal" /> My Projects
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadProjects}
              className="text-tcof-dark border-tcof-teal hover:bg-tcof-teal/10"
              disabled={isLoading}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            // Loading state
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tcof-teal mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your projects...</p>
            </div>
          ) : projects.length === 0 ? (
            // Empty state
            <Card className="border border-dashed border-gray-300 bg-gray-50">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Clipboard className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Projects Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Create your first project to start planning and organizing your change initiative.
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white mx-auto"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Create First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Projects grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-bold text-tcof-dark flex justify-between items-start">
                      <div className="truncate">{project.name || `Project ${project.id.slice(0, 5)}`}</div>
                      <Button
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-tcof-teal"
                        onClick={() => {
                          setProjectToDelete(project.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Created {formatDistanceToNow(new Date(project.created))} ago</span>
                    </div>
                    {project.lastUpdated && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Updated {formatDistanceToNow(new Date(project.lastUpdated))} ago</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-500 hover:text-tcof-teal"
                      onClick={() => handleGeneratePDF(project.id)}
                    >
                      <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button 
                      onClick={() => handleContinueProject(project.id)}
                      className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                      size="sm"
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About TCOF Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-tcof-dark">About The Connected Outcomes Framework</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start mb-4">
                <div className="mr-4">
                  <img 
                    src={vitruvianMan} 
                    alt="TCOF Logo" 
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div>
                  <p className="text-gray-700 mb-4">
                    The Connected Outcomes Framework provides a structured approach to navigate complex 
                    change initiatives, incorporating insights from Oxford University's SAID Business 
                    School on successful change delivery.
                  </p>
                  <p className="text-gray-700">
                    Our project-based toolkit helps teams align on goals, understand their context, 
                    and create actionable plans for delivering impactful change.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-6">
                <Link href="/get-your-bearings">
                  <Button variant="outline" className="border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10">
                    Learn About Our Tools
                  </Button>
                </Link>
                <Link href="/pro-tools">
                  <Button variant="outline" className="border-tcof-teal text-tcof-dark hover:bg-tcof-teal/10">
                    Pro Tools & Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter project details to create a new plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="E.g., Digital Transformation Initiative"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of your project"
                rows={3}
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteProject}
              variant="destructive"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SiteFooter />
    </div>
  );
}