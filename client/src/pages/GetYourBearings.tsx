import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/useProjects";
import { Compass, Map, GitBranch, PlusCircle, Briefcase } from "lucide-react";

export default function GetYourBearings() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const { projects, isLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const isAuthorized = isAuthenticated('starter-access') || !!user;
  
  // Check for selectedProjectId in localStorage on mount
  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setSelectedProjectId(storedProjectId);
    }
  }, []);
  
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
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-white to-tcof-light py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-tcof-dark">Get Your Bearings</h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6">
              Use these three tools to understand where you are and what you're trying to achieve
              before diving into your delivery journey.
            </p>
            <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
          </div>
        </section>
        
        {/* Project Section */}
        <section className="py-8 container mx-auto px-4">
          {isAuthorized && (
            <div className="max-w-6xl mx-auto mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-tcof-dark flex items-center">
                  <Briefcase className="w-6 h-6 mr-2 text-tcof-teal" />
                  Project Profile
                </h2>
                <Link href="/get-your-bearings/project-profile">
                  <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    New Project
                  </Button>
                </Link>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-tcof-teal border-t-transparent rounded-full"></div>
                </div>
              ) : projects.length === 0 ? (
                <Card className="border-2 border-tcof-teal/30 shadow-md bg-white p-6 text-center">
                  <div className="py-8">
                    <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-medium text-tcof-dark mb-2">No Projects Yet</h3>
                    <p className="text-gray-600 mb-6">Create your first project to get started with the TCOF tools</p>
                    <Link href="/get-your-bearings/project-profile">
                      <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white flex items-center gap-2 mx-auto">
                        <PlusCircle className="w-4 h-4" />
                        Create Project
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <Card 
                      key={project.id} 
                      className={`
                        border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
                        ${selectedProjectId === project.id ? 'border-tcof-teal bg-tcof-light/20' : 'border-gray-200 hover:border-tcof-teal/50'}
                      `}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        localStorage.setItem('selectedProjectId', project.id);
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <Briefcase className={`w-5 h-5 mr-2 ${selectedProjectId === project.id ? 'text-tcof-teal' : 'text-gray-400'}`} />
                            <h3 className="font-medium text-lg text-tcof-dark truncate">{project.name}</h3>
                          </div>
                          {selectedProjectId === project.id && (
                            <div className="bg-tcof-teal text-white text-xs px-2 py-1 rounded-full">Active</div>
                          )}
                        </div>
                        
                        {project.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs mb-4">
                          {project.sector && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{project.sector}</span>
                          )}
                          {project.currentStage && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{project.currentStage}</span>
                          )}
                        </div>
                        
                        <div className="flex justify-between">
                          <Link href={`/get-your-bearings/project-profile?edit=${project.id}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Edit Profile
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Link href="/get-your-bearings/project-profile">
                    <Card className="border-2 border-dashed border-gray-300 hover:border-tcof-teal/50 flex items-center justify-center p-6 min-h-[220px] transition-all hover:bg-gray-50">
                      <div className="text-center">
                        <PlusCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 font-medium">Create New Project</p>
                      </div>
                    </Card>
                  </Link>
                </div>
              )}
            </div>
          )}
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
      </main>
      
      <SiteFooter />
    </div>
  );
}