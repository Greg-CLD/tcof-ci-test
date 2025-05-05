import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useToast } from "@/hooks/use-toast";
import { 
  Clipboard, ClipboardCheck, FileDown, PlusCircle, Calendar, 
  Trash2, ArrowRight, FolderOpen, RefreshCcw, Clock, Edit, 
  Compass, MapPin, Lightbulb, Lock
} from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import { generateCompletePDF } from "@/lib/pdf-utils";
import vitruvianMan from "../assets/vitruvian-man.png";
import { useProjects, Project } from "@/hooks/useProjects";
import { useQueryClient } from "@tanstack/react-query";
import { useProjectContext } from "@/contexts/ProjectContext";
import ProjectProgressTracker from "@/components/home/ProjectProgressTracker";
import QuickLinkButtons from "@/components/home/QuickLinkButtons";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  
  // Get authentication status
  const { user } = useAuth();

  // Use the projects hook instead of manual state management
  const { 
    projects, 
    isLoading, 
    createProject,
    deleteProject
  } = useProjects();
  const queryClient = useQueryClient();
  
  // Get the current project context
  const { currentProject } = useProjectContext();

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

      // Create new project through the API with minimal required information
      const newProject = await createProject.mutateAsync({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      });

      // Store the project ID in localStorage
      localStorage.setItem('selectedProjectId', newProject.id);

      // Close dialog and clear form
      setCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");

      // Show a toast with a suggestion to complete the profile
      toast({
        title: "Project Created",
        description: "Your project has been created! You can complete your project profile later.",
      });

      // Stay on the homepage instead of redirecting to profile
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (error) {
      console.error("Error creating project:", error);
      // Error toast is handled by the mutation
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

      // Create a quick start project with minimal data
      const newProject = await createProject.mutateAsync({
        name: "Quick Start Project",
        description: "A pre-configured project with default success factor tasks"
      });
      
      // Store the project ID in localStorage
      localStorage.setItem('selectedProjectId', newProject.id);
      
      // Refresh project list
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Show success toast
      toast({
        title: "Quick Start Project Created",
        description: "Your project has been created with default tasks! You can complete your profile later.",
      });

      // Stay on the homepage instead of forcing navigation to profile
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
    // Set as current project in localStorage
    localStorage.setItem('selectedProjectId', projectId);

    // Stay on the home page (refreshing the page will show the tracker and quick links)
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    
    // Force a page refresh to show the tracker and quick links
    window.location.href = '/';
  };

  // Handle deleting a project
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      // Call the delete mutation from useProjects hook
      await deleteProject.mutateAsync(projectToDelete);
      
      // Clear selected project from localStorage if it was the deleted one
      const selectedProjectId = localStorage.getItem('selectedProjectId');
      if (selectedProjectId === projectToDelete) {
        localStorage.removeItem('selectedProjectId');
      }
      
      // Close the dialog and clear state
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Toast is already handled by the mutation
    }
  };

  // Handle generating a PDF export (for current project)
  const handleGeneratePDF = async (projectId: string) => {
    // Set as current project in localStorage
    localStorage.setItem('selectedProjectId', projectId);

    // TODO: Navigate to PDF export or generate directly
    toast({
      title: "PDF Export",
      description: "PDF export for projects is coming soon",
    });
  };

  // Handle generating a complete PDF for unauthenticated view
  const handleGenerateCompletePDF = () => {
    try {
      toast({
        title: "PDF Generation",
        description: "To generate comprehensive reports, please sign in or create an account.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was a problem creating your PDF. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-tcof-light text-tcof-dark">
      {/* Conditional rendering based on authentication status */}
      {user ? (
        // AUTHENTICATED VIEW - Project Dashboard
        <>
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
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })}
                  className="text-tcof-dark border-tcof-teal hover:bg-tcof-teal/10"
                  disabled={isLoading}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {/* Project Progress Tracker and Quick Links (when a project is selected) */}
              {currentProject && (
                <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-tcof-dark mb-4">
                    {currentProject.name}
                  </h3>
                  
                  {/* Project Progress Tracker */}
                  <ProjectProgressTracker />
                  
                  {/* Quick Link Buttons */}
                  <QuickLinkButtons projectId={currentProject.id} />
                </div>
              )}
              
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
                          <span>Created {formatDistanceToNow(new Date(project.createdAt))} ago</span>
                        </div>
                        {project.updatedAt && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Updated {formatDistanceToNow(new Date(project.updatedAt))} ago</span>
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
          
          <SiteFooter />
        </>
      ) : (
        // UNAUTHENTICATED VIEW - Marketing Landing Page
        <>
          {/* Hero Section */}
          <header className="bg-gradient-to-b from-white to-tcof-light py-16 md:py-24">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-tcof-dark to-tcof-teal inline-block text-transparent bg-clip-text">
                The Connected Outcomes Framework: 
                <span className="block mt-2">Your Toolkit for Delivering Impactful Change</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10">
                Navigate complexity, align teams, and deliver successful outcomes with our evidence-based toolkit
              </p>
              <div className="relative h-64 md:h-96 max-w-5xl mx-auto my-12 bg-tcof-dark/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-tcof-teal/20 to-tcof-dark/20 z-10"></div>
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <img 
                    src={vitruvianMan} 
                    alt="Vitruvian Man - TCOF" 
                    className="max-h-full object-contain"
                  />
                </div>
                <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-tcof-dark/60 to-transparent text-white text-center z-20">
                  <p className="font-medium">Inspired by research from Oxford University's SAID Business School</p>
                </div>
              </div>
            </div>
          </header>

          {/* Why These Tools Exist Section */}
          <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-tcof-dark">Why These Tools Exist</h2>
                <div className="h-1 w-20 bg-tcof-teal mx-auto mb-10"></div>
                <p className="text-lg md:text-xl text-gray-700 mb-6">
                  Delivering complex change is fundamentally a human challenge. Research shows that up to 70% of 
                  transformation initiatives fail, not because of technology or resources, but due to human 
                  factors like alignment, communication, and adaptability.
                </p>
                <p className="text-lg md:text-xl text-gray-700">
                  The Connected Outcomes Framework provides a structured approach to navigate these challenges, 
                  incorporating insights from Oxford University's SAID Business School on successful change delivery.
                </p>
              </div>
            </div>
          </section>

          {/* Main Decision Section - Two Cards */}
          <section className="py-16 bg-gradient-to-br from-tcof-light to-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-tcof-dark">
                What Would You Like To Do?
              </h2>
              <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Get Your Bearings Card */}
                <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 flex flex-col items-center justify-center">
                      <Compass className="h-24 w-24 text-tcof-teal mb-4" />
                      <h3 className="text-2xl font-bold text-tcof-dark">Get Your Bearings</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 mb-6">
                        Use our assessment tools to understand where you are and what you're trying to achieve.
                        Includes the Goal Mapping Tool, Cynefin Orientation Tool, and TCOF Journey Decision Tree.
                      </p>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-start">
                          <MapPin className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Map out your strategic goals and desired outcomes</span>
                        </li>
                        <li className="flex items-start">
                          <Compass className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Identify your domain's complexity level</span>
                        </li>
                        <li className="flex items-start">
                          <Lightbulb className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Determine your current journey stage</span>
                        </li>
                      </ul>
                      <Link href="/get-your-bearings">
                        <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                          Get Your Bearings <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Make a Plan Card */}
                <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-8 flex flex-col items-center justify-center">
                      <ClipboardCheck className="h-24 w-24 text-tcof-teal mb-4" />
                      <h3 className="text-2xl font-bold text-tcof-dark">Make a Plan</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 mb-6">
                        Develop a structured action plan based on your context and goals. Includes Success 
                        Factors Checklist, Delivery Approach Tool, and Project Outcome Tracking.
                      </p>
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-start">
                          <ClipboardCheck className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Build a tailored success factor checklist</span>
                        </li>
                        <li className="flex items-start">
                          <FileDown className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Export your plan as a PDF to share with stakeholders</span>
                        </li>
                        <li className="flex items-start">
                          <Compass className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                          <span className="text-gray-600">Track your progress and adapt as needed</span>
                        </li>
                      </ul>
                      <Link href="/auth">
                        <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                          Make a Plan <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Who Can Benefit Section */}
          <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-tcof-dark">Who Can Benefit</h2>
              <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                {/* Individuals */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-tcof-dark">Individuals</h3>
                  <p className="text-gray-700">
                    Project managers, change agents, and consultants leading strategic initiatives in complex environments
                  </p>
                </div>
                
                {/* Teams */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-tcof-dark">Teams</h3>
                  <p className="text-gray-700">
                    Cross-functional teams that need alignment on goals, context, and delivery approach for critical projects
                  </p>
                </div>
                
                {/* Organizations */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-tcof-dark">Organizations</h3>
                  <p className="text-gray-700">
                    Businesses undergoing transformation who want a standardized framework for planning and executing changes
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Get Started Banner */}
          <section className="py-12 bg-gradient-to-r from-tcof-dark to-tcof-teal">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl text-white font-bold mb-4">Ready to Start?</h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
                Pick a meaningful project or change initiative you're working on and apply our tools to gain clarity and structure.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  className="bg-white text-tcof-dark hover:bg-gray-100"
                  onClick={() => setLocation("/auth")}
                >
                  Sign In / Register <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => setLocation("/pro-tools")}
                >
                  Learn About Pro Tools <Lock className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
          
          <SiteFooter />
        </>
      )}

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
                placeholder="Brief overview of the project objectives and scope..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white ml-2"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <ConfirmationModal
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
      />
    </div>
  );
}