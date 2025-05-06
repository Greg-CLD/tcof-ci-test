import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Calendar, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SiteFooter from "@/components/SiteFooter";

export default function ProjectPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
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
              <h1 className="text-3xl font-bold text-tcof-dark mb-3">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2 mb-4">{project.description}</p>
              )}
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
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="plans">Plans</TabsTrigger>
                <TabsTrigger value="factors">Success Factors</TabsTrigger>
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Overview</CardTitle>
                    <CardDescription>Key information about this project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Project Tools</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => navigate(`/get-your-bearings/${projectId}`)}
                          >
                            Get Your Bearings
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => navigate(`/make-a-plan/${projectId}`)}
                          >
                            Make a Plan
                          </Button>
                          <Button 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => navigate(`/delegate-tasks/${projectId}`)}
                          >
                            Delegate Tasks
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="plans" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Plans</CardTitle>
                    <CardDescription>Plans associated with this project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No plans found for this project.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="factors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Success Factors</CardTitle>
                    <CardDescription>Key factors for project success</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Success factors will appear here once configured.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="outcomes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Outcomes</CardTitle>
                    <CardDescription>Tracked outcomes and metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No outcomes have been defined for this project.</p>
                  </CardContent>
                </Card>
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
      <SiteFooter />
    </div>
  );
}