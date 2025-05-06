import React, { useEffect } from "react";
import { useLocation, useParams, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList, Clock, Award, ChevronRight, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function MakeAPlan() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
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
  
  useEffect(() => {
    console.log("Tool mounted:", location);
  }, [location]);
  
  // If we're on the direct route with no project ID, redirect to organizations
  if (location === "/make-a-plan" && !projectId) {
    console.log("Missing projectId, redirecting to /organisations");
    return <Redirect to="/organisations" />;
  }
  
  // Guard against invalid state - no project ID available
  if (!projectId) {
    console.log("No projectId available in MakeAPlan, rendering empty state");
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Select a Project</h2>
        <p className="mb-6">Please select a project from your organisations page first.</p>
        <Button onClick={() => navigate("/organisations")}>
          Go to Organisations
        </Button>
      </div>
    );
  }
  
  // Authentication check component
  const AuthCheck = () => (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
      <p className="text-gray-600 mb-6">You need to sign in or enter the access password to use these tools.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
          onClick={() => navigate("/auth")}
        >
          Sign In
        </Button>
        <Button 
          variant="outline" 
          className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
          onClick={() => navigate("/tools/starter-access")}
        >
          Enter Access Password
        </Button>
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
            {project ? `${project.name}: Make a Plan` : "Make a Plan"}
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6">
            Create a structured action plan for your transformation or delivery initiative using the
            Connected Outcomes Framework
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
      
      {/* Intro Section */}
      <section className="py-12 container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-tcof-light to-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-tcof-dark">Step-by-Step Planning Tool</h2>
          <p className="text-gray-700 mb-6">
            Based on your current position in the delivery journey, this tool will guide you through creating a
            comprehensive action plan tailored to your specific context and challenges.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-tcof-teal" />
              </div>
              <h3 className="font-bold mb-2">Structured Process</h3>
              <p className="text-sm text-gray-600">Follow a proven methodology to create your delivery plan</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-tcof-teal" />
              </div>
              <h3 className="font-bold mb-2">Save Time</h3>
              <p className="text-sm text-gray-600">Our templates and guidance help you plan efficiently</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-tcof-teal" />
              </div>
              <h3 className="font-bold mb-2">Research-Based</h3>
              <p className="text-sm text-gray-600">Built on Oxford University's research on successful delivery</p>
            </div>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
            <p className="text-amber-800">
              <strong>Recommendation:</strong> Complete the tools in "Get Your Bearings" before using this planning tool for best results.
            </p>
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              className="border-tcof-teal text-tcof-teal hover:bg-tcof-light mr-4"
              onClick={() => navigate(projectId ? `/get-your-bearings/${projectId}` : "/get-your-bearings")}
            >
              First, Get Your Bearings
            </Button>
            
            <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
              Coming Soon <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12 text-tcof-dark">What You'll Create</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Success Criteria</h3>
                <p className="text-sm text-gray-600">Clear metrics and KPIs to measure progress and outcomes</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Risk Assessment</h3>
                <p className="text-sm text-gray-600">Identify and mitigate potential obstacles to delivery</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Stakeholder Map</h3>
                <p className="text-sm text-gray-600">Strategy for engaging and aligning key stakeholders</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Action Timeline</h3>
                <p className="text-sm text-gray-600">Sequenced activities with responsibilities and deadlines</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Coming Soon Banner */}
      <section className="py-16 bg-gradient-to-r from-tcof-dark to-tcof-teal">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl text-white font-bold mb-4">Coming Soon</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Our planning tool is currently in development. Sign up to be notified when it launches.
          </p>
          <Button 
            className="bg-white text-tcof-dark hover:bg-gray-100"
            onClick={() => navigate("/auth")}
          >
            Create Account for Updates
          </Button>
        </div>
      </section>
    </>
  );
}