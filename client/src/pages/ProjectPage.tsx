import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useProgress } from "@/contexts/ProgressContext";
import Checklist from "@/pages/Checklist";
import { 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  User, 
  Building, 
  Edit, 
  Trash2, 
  PlusCircle, 
  MapPin, 
  Compass, 
  Route,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/Breadcrumb";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function ProjectPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { progress } = useProgress();

  // Fetch project details
  const { 
    data: project, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch project details");
      }
      return res.json();
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete project");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      });

      // Navigate back to organisation page or organisations list
      if (project?.organisationId) {
        navigate(`/organisations/${project.organisationId}`);
      } else {
        navigate("/organisations");
      }

      // Invalidate projects query to refresh lists
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive",
      });
    }
  });

  // Handle project deletion
  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
  };

  // Handle navigation back to organisations list/dashboard
  const handleBack = () => {
    // If we have organisation ID, go back to that org's dashboard
    if (project?.organisationId) {
      navigate(`/organisations/${project.organisationId}`);
    } else {
      // Fallback to organisations list
      navigate("/organisations");
    }
  };

  // Handle edit project
  const handleEditProject = () => {
    // Navigate to simplified edit project page with current project ID
    if (project && project.organisationId) {
      navigate(`/organisations/${project.organisationId}/projects/${projectId}/edit-basic`);
    } else {
      navigate(`/projects/${projectId}/edit-basic`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          {/* Breadcrumb is now in AppLayout - don't include it here */}
          <div></div> {/* Empty div to maintain flex spacing */}
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mt-2 md:mt-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-10 w-10 animate-spin text-tcof-teal" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Project</CardTitle>
              <CardDescription className="text-red-500">
                {error instanceof Error ? error.message : "An unknown error occurred"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/organisations")}>
                Return to Organisations
              </Button>
            </CardContent>
          </Card>
        ) : project ? (
          <div className="space-y-8">
            <div className="border-b pb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-tcof-dark mb-3">{project.name}</h1>
                  {project.description && (
                    <p className="text-gray-600 mt-2 mb-4">{project.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEditProject}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
                {project.organisationId && (
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-1" />
                    Organisation Project
                  </div>
                )}
              </div>
            </div>

            {/* Delete Project Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project 
                    "{project.name}" and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteProject}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteProjectMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </div>
                    ) : "Delete Project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="getYourBearings">Get Your Bearings</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <Button variant="outline" onClick={() => setShowHelp(true)}>
                  Make A Plan – Intro
                </Button>
              </TabsList>

              {/* Help Dialog */}
              <AlertDialog open={showHelp} onOpenChange={setShowHelp}>
                <AlertDialogContent className="max-w-4xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl text-tcof-teal">Make A Plan Flow</AlertDialogTitle>
                  </AlertDialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left column with instructions */}
                    <div className="space-y-4">
                      <p className="font-medium">To Make a Plan, follow this journey.</p>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-bold text-lg">Get Your Bearings</h3>
                          <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>Set Your Direction, Identify the goal</li>
                            <li>Plot Your Position, figure out where you are on the Delivery Journey.</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-bold text-lg">Make A Decision</h3>
                          <p>Option A) Start with TCOF or Option B) Create Your Customised Plan</p>
                          <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li>If Option A, Start with TCOF, Go straight to Checklist</li>
                            <li>If Option B, Customised, go to Make Your Plan</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-bold text-lg">Checklist</h3>
                          <p>Both Options take you to the checklist, you may skip any step and return at a later date.</p>
                        </div>
                      </div>

                      <p className="mt-6 italic">
                        TCOF and the companion application are designed to help guide you through this journey.
                        To your success.
                      </p>
                    </div>

                    {/* Right column with flowchart */}
                    <div className="flex justify-center items-start">
                      <img 
                        src="/assets/make-a-plan-flow.png" 
                        alt="Make A Plan Flow Chart" 
                        className="max-w-full h-auto rounded-md border shadow-sm"
                      />
                    </div>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogAction 
                      onClick={() => setShowHelp(false)}
                      className="bg-tcof-teal hover:bg-tcof-teal/90"
                    >
                      Got it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Overview</CardTitle>
                    <CardDescription>Key information about this project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-4 grid grid-cols-1 gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Sector</span>
                          <span className="font-medium">{project?.sector || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Industry (SIC code)</span>
                          <span className="font-medium">{project?.industry || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Organisation Size</span>
                          <span className="font-medium">{project?.organisationSize || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Description</span>
                          <span className="font-medium">{project?.description || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h3 className="font-semibold mb-4">Project Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/tools/goal-mapping/${projectId}`);
                            }}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Get Your Bearings
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/make-a-plan/${projectId}`);
                            }}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Make a Plan
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/projects/${projectId}/outcomes`);
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Outcomes & Delegation
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="getYourBearings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Get Your Bearings</CardTitle>
                    <CardDescription>Tools to help you understand your project context</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-4">
                          <h3 className="font-semibold">Tool Status</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                              <div className="flex items-center">
                                <MapPin className="h-5 w-5 text-slate-700 mr-2" />
                                <span className="font-medium">Goal Mapping</span>
                              </div>
                              <Badge 
                                className={progress?.tools?.goalMapping?.completed 
                                  ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"}
                              >
                                {progress?.tools?.goalMapping?.completed 
                                  ? <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                                  : <><Clock className="h-3 w-3 mr-1" /> Not Started</>}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                              <div className="flex items-center">
                                <Compass className="h-5 w-5 text-slate-700 mr-2" />
                                <span className="font-medium">Cynefin Orientation</span>
                              </div>
                              <Badge 
                                className={progress?.tools?.cynefinOrientation?.completed 
                                  ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"}
                              >
                                {progress?.tools?.cynefinOrientation?.completed 
                                  ? <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                                  : <><Clock className="h-3 w-3 mr-1" /> Not Started</>}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                              <div className="flex items-center">
                                <Route className="h-5 w-5 text-slate-700 mr-2" />
                                <span className="font-medium">TCOF Journey</span>
                              </div>
                              <Badge 
                                className={progress?.tools?.tcofJourney?.completed 
                                  ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"}
                              >
                                {progress?.tools?.tcofJourney?.completed 
                                  ? <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                                  : <><Clock className="h-3 w-3 mr-1" /> Not Started</>}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">Available Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/tools/goal-mapping/${projectId}`);
                            }}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Goal Mapping
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/tools/cynefin-orientation/${projectId}`);
                            }}
                          >
                            <Compass className="mr-2 h-4 w-4" />
                            Cynefin Orientation
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => {
                              localStorage.setItem('currentProjectId', projectId);
                              navigate(`/tools/tcof-journey/${projectId}`);
                            }}
                          >
                            <Route className="mr-2 h-4 w-4" />
                            TCOF Journey
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="checklist">
                <Checklist projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Project Not Found</CardTitle>
              <CardDescription>The requested project could not be found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/organisations")}>
                Return to Organisations
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

    </div>
  );
}