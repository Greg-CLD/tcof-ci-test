import { Switch, Route, Link, useLocation, useParams, Redirect } from "wouter";
import { useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AllProjects from "@/pages/AllProjects";
import ProTools from "@/pages/ProTools";
import StarterAccess from "@/pages/StarterAccess";
import GetYourBearings from "@/pages/GetYourBearings";
import MakeAPlan from "@/pages/MakeAPlan";
import MakeAPlanLanding from "@/pages/MakeAPlanLanding";
import MakeAPlanFullIntro from "@/pages/MakeAPlanFullIntro";
import MakeAPlanFull from "@/pages/MakeAPlanFull";
import AdminPresetEditor from "@/pages/AdminPresetEditor";
import AdminFactorEditor from "@/pages/AdminFactorEditor";
import GraphExplorer from "@/pages/GraphExplorer";
import Block1Discover from "@/pages/make-a-plan/Block1Discover";
import Block1Step1 from "@/pages/make-a-plan/Block1Step1";
import Block1Step2 from "@/pages/make-a-plan/Block1Step2";
import Block2Step3 from "@/pages/make-a-plan/Block2Step3";
import Block2Step4 from "@/pages/make-a-plan/Block2Step4";
import Block2Design from "@/pages/make-a-plan/Block2Design";
import Block3Deliver from "@/pages/make-a-plan/Block3Deliver";
import Block3Complete from "@/pages/Block3Complete";
import Checklist from "@/pages/Checklist";
import FactorChecklist from "@/pages/FactorChecklist";
import Pricing from "@/pages/Pricing";
import AuthPage from "@/pages/auth-page";
import UserHistory from "@/pages/UserHistory";
import ProfilePage from "@/pages/ProfilePage";
import UserProfileSettings from "@/pages/UserProfileSettings";
import ProjectProfile from "@/pages/ProjectProfile";
import Dashboard from "@/pages/Dashboard";
import OutcomeManagement from "@/pages/OutcomeManagement";
import OrganisationListPage from "@/pages/OrganisationListPage";
import OrganisationDashboardPage from "@/pages/OrganisationDashboardPage";
import OrganisationHeuristicsPage from "@/pages/OrganisationHeuristicsPage";
import ProjectPage from "@/pages/ProjectPage";
import BasicProjectEditPage from "@/pages/BasicProjectEditPage";
import TestAuth from "@/pages/TestAuth";
import { AuthProtectionProvider, useAuthProtection } from "@/hooks/use-auth-protection";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProtectedRouteGuard } from "@/components/ProtectedRouteGuard";
import { Button } from "@/components/ui/button";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";
import AppLayout from "@/layouts/AppLayout";
import GlobalNav from "@/components/GlobalNav";
import AuthRequired from "@/components/AuthRequired";
import SiteFooter from "@/components/SiteFooter";

// Tool components with consistent layout
const GoalMappingPage = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const storedProjectId = localStorage.getItem('currentProjectId');
  const projectId = routeProjectId || storedProjectId;
  const [_, navigate] = useLocation();
  
  console.log(`GoalMappingPage: Using projectId: ${projectId} (from route: ${routeProjectId}, from localStorage: ${storedProjectId})`);
  
  // Store the projectId in localStorage for consistency across pages
  useEffect(() => {
    if (projectId && !storedProjectId) {
      console.log(`GoalMappingPage: Storing projectId in localStorage: ${projectId}`);
      localStorage.setItem('currentProjectId', projectId);
    }
  }, [projectId, storedProjectId]);
  
  // Handler for navigation back to the project
  const handleBackToProject = () => {
    // Get saved organisation ID from localStorage
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId && projectId) {
      navigate(`/organisations/${orgId}/projects/${projectId}`);
    } else {
      // Fallback to old path if no organization ID available
      navigate(`/projects/${projectId}`);
    }
  };
  
  return (
    <main className="flex-grow container mx-auto px-4 py-12">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-tcof-dark">Goal Mapping Tool</h1>
        {projectId && (
          <Button 
            variant="outline" 
            onClick={handleBackToProject}
          >
            Back to Project
          </Button>
        )}
      </div>
      <GoalMappingTool projectId={projectId} />
    </main>
  );
};

const CynefinOrientationPage = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const storedProjectId = localStorage.getItem('currentProjectId');
  const projectId = routeProjectId || storedProjectId;
  const [_, navigate] = useLocation();
  
  console.log(`CynefinOrientationPage: Using projectId: ${projectId} (from route: ${routeProjectId}, from localStorage: ${storedProjectId})`);
  
  // Store the projectId in localStorage for consistency across pages
  useEffect(() => {
    if (projectId && !storedProjectId) {
      console.log(`CynefinOrientationPage: Storing projectId in localStorage: ${projectId}`);
      localStorage.setItem('currentProjectId', projectId);
    }
  }, [projectId, storedProjectId]);
  
  // Handler for navigation back to the project
  const handleBackToProject = () => {
    // Get saved organisation ID from localStorage
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId && projectId) {
      navigate(`/organisations/${orgId}/projects/${projectId}`);
    } else {
      // Fallback to old path if no organization ID available
      navigate(`/projects/${projectId}`);
    }
  };
  
  return (
    <main className="flex-grow container mx-auto px-4 py-12">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-tcof-dark">Cynefin Orientation Tool</h1>
        {projectId && (
          <Button 
            variant="outline" 
            onClick={handleBackToProject}
          >
            Back to Project
          </Button>
        )}
      </div>
      <CynefinOrientationTool projectId={projectId} />
    </main>
  );
};

const TCOFJourneyPage = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const storedProjectId = localStorage.getItem('currentProjectId');
  const projectId = routeProjectId || storedProjectId;
  const [_, navigate] = useLocation();
  
  console.log(`TCOFJourneyPage: Using projectId: ${projectId} (from route: ${routeProjectId}, from localStorage: ${storedProjectId})`);
  
  // Store the projectId in localStorage for consistency across pages
  useEffect(() => {
    if (projectId && !storedProjectId) {
      console.log(`TCOFJourneyPage: Storing projectId in localStorage: ${projectId}`);
      localStorage.setItem('currentProjectId', projectId);
    }
  }, [projectId, storedProjectId]);
  
  // Handler for navigation back to the project
  const handleBackToProject = () => {
    // Get saved organisation ID from localStorage
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId && projectId) {
      navigate(`/organisations/${orgId}/projects/${projectId}`);
    } else {
      // Fallback to old path if no organization ID available
      navigate(`/projects/${projectId}`);
    }
  };
  
  return (
    <main className="flex-grow container mx-auto px-4 py-12">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-tcof-dark">TCOF Journey Tool</h1>
        {projectId && (
          <Button 
            variant="outline" 
            onClick={handleBackToProject}
          >
            Back to Project
          </Button>
        )}
      </div>
      <TCOFJourneyTool projectId={projectId} />
    </main>
  );
};

function Router() {
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const hasRedirectedRef = useRef(false);
  
  // We won't use useEffect for redirects to avoid the infinite loop issues
  // Instead we'll use more granular control with direct conditional rendering
  
  // Log current location on each render for debugging
  console.log("Current location in Router:", location, { user, hasRedirected: hasRedirectedRef.current });
  
  // Hard-Stop Redirect Rule: Run once per mount, with a ref to prevent multiple redirects
  if (user && (location === '/' || location === '/auth') && !hasRedirectedRef.current) {
    console.log("NAVIGATE FROM", location, "TO /all-projects (ONE-TIME REDIRECT)");
    hasRedirectedRef.current = true;
    navigate('/all-projects');
    return null; // Critical: DO NOT render anything during redirect
  }
  
  // If user tries to go to /get-your-bearings, redirect to /organisations
  if (location === '/get-your-bearings' && !hasRedirectedRef.current) {
    console.log("Intercepting /get-your-bearings, redirecting to /organisations");
    hasRedirectedRef.current = true;
    navigate('/organisations');
    return null; // Critical: DO NOT render during navigation
  }
  
  // Don't allow users to directly access tool pages without selecting a project
  if (user && location === '/make-a-plan' && !localStorage.getItem('selectedProjectId')) {
    console.log("Missing projectId, redirecting to /organisations");
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate('/organisations');
      return null; // Critical: DO NOT render during navigation
    }
  }
  
  // For organization routes, if not logged in, redirect to home
  if (!user && (location === '/organisations' || location.startsWith('/organisations/'))) {
    return (
      <Redirect to="/" />
    );
  }
  
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>

      {/* All Projects route - authenticated users only */}
      <Route path="/all-projects">
        {user ? (
          <ProtectedRouteGuard>
            <AllProjects />
          </ProtectedRouteGuard>
        ) : (
          <Redirect to="/" />
        )}
      </Route>
      
      {/* Organizations management - authenticated users only */}
      <Route path="/organisations">
        {user ? (
          <ProtectedRouteGuard>
            <OrganisationListPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Organisation Dashboard - authenticated users only */}
      <Route path="/organisations/:orgId">
        {user ? (
          <ProtectedRouteGuard>
            <OrganisationDashboardPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Organisation Heuristics - authenticated users only */}
      <Route path="/organisations/:orgId/heuristics">
        {user ? (
          <ProtectedRouteGuard>
            <OrganisationHeuristicsPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      <Route path="/pro-tools" component={ProTools} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/test-auth" component={TestAuth} />
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/history" component={UserHistory} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/settings">
        {user ? (
          <ProtectedRouteGuard>
            <UserProfileSettings />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      {/* Make sure we use the most specific routes first */}
      <Route path="/get-your-bearings/project-profile">
        <ProjectProfile />
      </Route>
      <Route path="/get-your-bearings/:projectId">
        <Redirect to="/organisations" />
      </Route>
      {/* Make a Plan routes - most specific first */}
      <Route path="/make-a-plan/admin/factors" component={AdminFactorEditor} />
      <Route path="/make-a-plan/admin/graph-explorer" component={GraphExplorer} />
      <Route path="/make-a-plan/admin" component={AdminPresetEditor} />
      <Route path="/make-a-plan/full/intro">
        <ProtectedRouteGuard>
          <MakeAPlanFullIntro />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/full/block-1">
        <ProtectedRouteGuard>
          <Block1Discover />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/full/block-2">
        <ProtectedRouteGuard>
          <Block2Design />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/full/block-3">
        <ProtectedRouteGuard>
          <Block3Complete />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/full/:blockId">
        <ProtectedRouteGuard>
          <MakeAPlanFull />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/landing">
        <ProtectedRouteGuard>
          <MakeAPlanLanding />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-1/step-1">
        <ProtectedRouteGuard>
          <Block1Step1 />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-1/step-2">
        <ProtectedRouteGuard>
          <Block1Step2 />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-1">
        <ProtectedRouteGuard>
          <Block1Discover />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-2/step-3">
        <ProtectedRouteGuard>
          <Block2Step3 />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-2">
        <ProtectedRouteGuard>
          <Block2Design />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/block-3">
        <ProtectedRouteGuard>
          <Block3Deliver />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId/full">
        <ProtectedRouteGuard>
          <MakeAPlanFull />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/:projectId">
        <ProtectedRouteGuard>
          <MakeAPlan />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan">
        <ProtectedRouteGuard>
          <MakeAPlan />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/checklist">
        <ProtectedRouteGuard>
          <Checklist />
        </ProtectedRouteGuard>
      </Route>
      
      <Route path="/factor-checklist">
        <ProtectedRouteGuard>
          <FactorChecklist />
        </ProtectedRouteGuard>
      </Route>
      
      <Route path="/projects/:projectId/outcomes">
        <ProtectedRouteGuard>
          <OutcomeManagement />
        </ProtectedRouteGuard>
      </Route>
      
      {/* Project Setup Page (for editing project profile) */}
      <Route path="/projects/:projectId/setup">
        {user ? (
          <ProtectedRouteGuard>
            <ProjectProfile editMode={true} />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* NEW SIMPLIFIED EDIT ROUTES */}
      {/* Basic Project Edit Page - direct route */}
      <Route path="/projects/:projectId/edit-basic">
        {user ? (
          <ProtectedRouteGuard>
            <BasicProjectEditPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Basic Project Edit Page with Organization context */}
      <Route path="/organisations/:orgId/projects/:projectId/edit-basic">
        {user ? (
          <ProtectedRouteGuard>
            <BasicProjectEditPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Project Profile Edit Page - OLD PATH */}
      <Route path="/projects/:projectId/profile/edit">
        {user ? (
          <ProtectedRouteGuard>
            <ProjectProfile editMode={true} />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Project Detail Page - OLD PATH */}
      <Route path="/projects/:projectId">
        <ProtectedRouteGuard>
          <ProjectPage />
        </ProtectedRouteGuard>
      </Route>
      
      {/* NEW ROUTES WITH ORGANIZATION CONTEXT */}
      {/* Project Profile Edit Page with Organization */}
      <Route path="/organisations/:orgId/projects/:projectId/profile/edit">
        {user ? (
          <ProtectedRouteGuard>
            <ProjectProfile editMode={true} />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Project Detail Page with Organization */}
      <Route path="/organisations/:orgId/projects/:projectId">
        <ProtectedRouteGuard>
          <ProjectPage />
        </ProtectedRouteGuard>
      </Route>
      
      {/* Dashboard route - protected like other tools */}
      <Route path="/dashboard">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <Dashboard />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access your dashboard." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      {/* Tools routes - Most specific first */}
      
      {/* Goal mapping with project ID */}
      <Route path="/tools/goal-mapping/:projectId">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <GoalMappingPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      {/* Cynefin orientation with project ID */}
      <Route path="/tools/cynefin-orientation/:projectId">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <CynefinOrientationPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      {/* TCOF journey with project ID */}
      <Route path="/tools/tcof-journey/:projectId">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <TCOFJourneyPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      {/* Base routes without project IDs */}
      <Route path="/tools/goal-mapping">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <GoalMappingPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      <Route path="/tools/cynefin-orientation">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <CynefinOrientationPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      <Route path="/tools/tcof-journey">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <TCOFJourneyPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to purchase a license or sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Dev-only import for accessibility audit
import A11yAuditProvider from '@/components/A11yAuditProvider';
import { PlanProvider } from '@/contexts/PlanContext';
import { ProjectProvider } from '@/contexts/ProjectContext';

function App() {
  // Check if we're in development mode
  const isDev = import.meta.env.DEV;
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProtectionProvider>
          {/* Only enable accessibility audits in development */}
          <A11yAuditProvider disabled={!isDev}>
            <ProgressProvider>
              <PlanProvider>
                <ProjectProvider>
                  <AppLayout>
                    <Router />
                  </AppLayout>
                </ProjectProvider>
              </PlanProvider>
            </ProgressProvider>
          </A11yAuditProvider>
        </AuthProtectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
