import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/useProjects";
import { Compass, Map, GitBranch, PlusCircle, Briefcase, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function GetYourBearings() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const isAuthorized = isAuthenticated('starter-access') || !!user;
  
  // Fetch project details if projectId is provided
  const { 
    data: project, 
    isLoading: projectLoading 
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      console.log(`Fetching project details for: ${projectId}`);
      const res = await apiRequest("GET", `/api/projects-detail/${projectId}`);
      if (!res.ok) {
        console.error("Failed to fetch project details");
        return null;
      }
      return res.json();
    },
    enabled: !!projectId
  });
  
  // Update selectedProjectId when projectId param changes
  useEffect(() => {
    if (projectId) {
      console.log(`Setting selected project ID from URL param: ${projectId}`);
      setSelectedProjectId(projectId);
      localStorage.setItem('selectedProjectId', projectId);
    } else {
      // Check for selectedProjectId in localStorage when no projectId in URL
      const storedProjectId = localStorage.getItem('selectedProjectId');
      if (storedProjectId) {
        console.log(`Setting selected project ID from localStorage: ${storedProjectId}`);
        setSelectedProjectId(storedProjectId);
      }
    }
  }, [projectId]);
  
  // Authentication check component
  const AuthCheck = () => (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
      <p className="text-gray-600 mb-6">You need to sign in or enter the access password to use these tools.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/auth">
          <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
            Sign In
          </Button>
        </Link>
        <Link href="/tools/starter-access">
          <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-light">
            Enter Access Password
          </Button>
        </Link>
      </div>
    </div>
  );
  
  return (
    <>
      {projectId && (
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Button>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-tcof-light py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-tcof-dark">
            {project ? `${project.name}: Get Your Bearings` : "Get Your Bearings"}
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6">
            Use these three tools to understand where you are and what you're trying to achieve
            before diving into your delivery journey.
          </p>
          {project && (
            <div className="bg-white shadow rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="font-medium text-tcof-dark">Project Context:</p>
              <p className="text-gray-600">
                {project.description || "No project description available"}
              </p>
            </div>
          )}
          <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
        </div>
      </section>
      
      {/* Tools Section */}
      <section className="py-8 container mx-auto px-4">
        {isAuthorized ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Goal-Mapping Tool */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex items-center justify-center">
                  <Map className="h-16 w-16 text-tcof-teal" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-tcof-dark">Goal-Mapping Tool</h3>
                  <p className="text-gray-700 mb-6">Map your strategic, business, and product goals using the Success Map framework. Align your team around clear outcomes.</p>
                  <p className="text-sm text-gray-500 mb-4">When to use this tool:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mb-6">
                    <li>At the start of new initiatives</li>
                    <li>When your team lacks clear direction</li>
                    <li>To align stakeholders on desired outcomes</li>
                  </ul>
                  <Link href="/tools/goal-mapping">
                    <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Start Goal Mapping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Cynefin Orientation Tool */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 flex items-center justify-center">
                  <Compass className="h-16 w-16 text-tcof-teal" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-tcof-dark">Cynefin Orientation Tool</h3>
                  <p className="text-gray-700 mb-6">Determine whether your domain is Clear, Complicated, Complex, or Chaotic to choose the right approach.</p>
                  <p className="text-sm text-gray-500 mb-4">When to use this tool:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mb-6">
                    <li>When facing uncertainty about approach</li>
                    <li>To determine appropriate planning method</li>
                    <li>Before committing to a delivery strategy</li>
                  </ul>
                  <Link href="/tools/cynefin-orientation">
                    <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Start Cynefin Assessment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* TCOF Journey Decision Tree */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 flex items-center justify-center">
                  <GitBranch className="h-16 w-16 text-tcof-teal" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-tcof-dark">TCOF Journey Decision Tree</h3>
                  <p className="text-gray-700 mb-6">Navigate through the delivery process and determine your current journey stage.</p>
                  <p className="text-sm text-gray-500 mb-4">When to use this tool:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mb-6">
                    <li>When joining an ongoing initiative</li>
                    <li>To assess progress in your delivery</li>
                    <li>To identify appropriate next steps</li>
                  </ul>
                  <Link href="/tools/tcof-journey">
                    <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Start Journey Assessment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <AuthCheck />
        )}
      </section>
    </>
  );
}