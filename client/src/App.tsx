import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Switch, Route, Link, useLocation, useParams, Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PlanProvider } from '@/contexts/PlanContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { FeedbackProvider } from '@/components/ui/feedback/feedback-context';
import { FeedbackContainer } from '@/components/ui/feedback/feedback-container';
import { AppInitializer } from '@/components/AppInitializer';
import A11yAuditProvider from '@/components/A11yAuditProvider';

// Import debugging utilities to make them available globally
import './components/debug/enableDebugLogging';

// Import all your components and routes...
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AllProjects from "@/pages/AllProjects";
import ProTools from "@/pages/ProTools";
import SuccessFactorsTest from './components/test/SuccessFactorsTest';
import StarterAccess from "@/pages/StarterAccess";
import GetYourBearings from "@/pages/GetYourBearings";
import MakeAPlan from "@/pages/MakeAPlan";
import MakeAPlanLanding from "@/pages/MakeAPlanLanding";
import MakeAPlanFullIntro from "@/pages/MakeAPlanFullIntro";
import MakeAPlanFull from "@/pages/MakeAPlanFull";
import AdminPresetEditor from "@/pages/AdminPresetEditor";
import AdminDiagnostics from "@/pages/AdminDiagnostics";
// Using the enhanced SuccessFactorEditor with tabbed interface
import SuccessFactorEditor from "@/components/admin/SuccessFactorEditor";
import SimpleFactorEditor from "@/components/admin/SimpleFactorEditor";
import GraphExplorer from "@/pages/GraphExplorer";
import Block1Discover from "@/pages/make-a-plan/Block1Discover";
import Block1Step1 from "@/pages/make-a-plan/Block1Step1";
import Block1Step2 from "@/pages/make-a-plan/Block1Step2";
import Block2Step3 from "@/pages/make-a-plan/Block2Step3";
import Block2Step4 from "@/pages/make-a-plan/Block2Step4";
import Block2Step5 from "@/pages/make-a-plan/Block2Step5";
import Block2Design from "@/pages/make-a-plan/Block2Design";
import Block3Deliver from "@/pages/make-a-plan/Block3Deliver";
import Block3Complete from "@/pages/Block3Complete";
import Checklist from "@/pages/Checklist";
import FactorChecklist from "@/pages/FactorChecklist";
import FinalChecklist from "@/pages/FinalChecklist";
import Pricing from "@/pages/Pricing";
import AuthPage from "@/pages/AuthPage";
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
import TestPersistencePage from "@/pages/test-persistence";
import UUIDTestPage from "@/pages/uuid-test"; // Added UUID utility test page
import FeedbackDemo from "@/components/FeedbackDemo";
import { AuthProtectionProvider, useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/hooks/auth-hook";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { ProtectedRoute } from "@/components/protected-route";
import { ProtectedRouteGuard } from "@/components/ProtectedRouteGuard";
import { Button } from "@/components/ui/button";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";
import AppLayout from "@/layouts/AppLayout";
import GlobalNav from "@/components/GlobalNav";
import AuthRequired from "@/components/AuthRequired";
import SiteFooter from "@/components/SiteFooter";
import { Suspense } from "react";
import { useProject } from "@/contexts/ProjectContext";

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
  const authProtection = useAuthProtection();
  const { user, isAuthenticated } = useAuth();
  const { projectId: currentProjectId } = useProject(); // Use project context instead of direct localStorage access
  const [location, navigate] = useLocation();
  const hasRedirectedRef = useRef(false);
  
  // Enhanced logging shows both auth state and project state
  console.log("Current location in Router:", location, { 
    user: user?.username || 'none', 
    isAuthenticated, 
    currentProjectId,
    hasRedirected: hasRedirectedRef.current 
  });

  useEffect(() => {
    // Only run these redirects once both auth and project contexts are fully loaded
    // and only on first render - prevents multiple redirects
    
    if (hasRedirectedRef.current) {
      return; // Skip if we've already redirected
    }

    // Only redirect authenticated users from home/auth pages to projects
    if (isAuthenticated && (location === '/' || location === '/auth')) {
      console.log("NAVIGATE FROM", location, "TO /all-projects (DEFERRED REDIRECT)");
      hasRedirectedRef.current = true;
      navigate('/all-projects');
    }
    
    // Redirect /get-your-bearings to /organisations
    else if (location === '/get-your-bearings') {
      console.log("Intercepting /get-your-bearings, redirecting to /organisations");
      hasRedirectedRef.current = true;
      navigate('/organisations');
    }
    
    // Redirect tool pages without project context to org selection
    else if (isAuthenticated && location === '/make-a-plan' && !currentProjectId) {
      console.log("Missing projectId, redirecting to /organisations");
      hasRedirectedRef.current = true;
      navigate('/organisations');
    }
  }, [isAuthenticated, location, currentProjectId, navigate]); // Dependencies ensure this runs when needed

  // We still need this redirect check here for auth protection
  if (!isAuthenticated && (location === '/organisations' || location.startsWith('/organisations/'))) {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>

      {/* All Projects route - authenticated users only */}
      <Route path="/all-projects">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <AllProjects />
          </ProtectedRouteGuard>
        ) : (
          <Redirect to="/" />
        )}
      </Route>

      {/* Organizations management - authenticated users only */}
      <Route path="/organisations">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <OrganisationListPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Organisation Dashboard - authenticated users only */}
      <Route path="/organisations/:orgId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <OrganisationDashboardPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Organisation Heuristics - authenticated users only */}
      <Route path="/organisations/:orgId/heuristics">
        {isAuthenticated ? (
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
      <Route path="/test-persistence">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <TestPersistencePage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/test-persistence/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <TestPersistencePage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/uuid-test">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <UUIDTestPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/feedback-demo" component={FeedbackDemo} />
      <Route path="/history" component={UserHistory} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/settings">
        {isAuthenticated ? (
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
      <Route path="/make-a-plan/admin/factors/simple" component={SimpleFactorEditor} />
      <Route path="/make-a-plan/admin/factors" component={SuccessFactorEditor} />
      <Route path="/make-a-plan/admin/graph-explorer" component={GraphExplorer} />
      <Route path="/make-a-plan/admin/diagnostics" component={AdminDiagnostics} />
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
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <MakeAPlanLanding />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-1/step-1">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block1Step1 />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-1/step-2">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block1Step2 />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-1">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block1Discover />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-2/step-3">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block2Step3 />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-2/step-4">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block2Step4 />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-2/step-5">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block2Step5 />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-2">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block2Design />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/block-3">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Block3Deliver />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId/full">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <MakeAPlanFull />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <MakeAPlan />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      <Route path="/make-a-plan">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <MakeAPlan />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      {/* Project-specific checklist route */}
      <Route path="/projects/:projectId/checklist">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Checklist />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>
      
      {/* Legacy checklist route - for backward compatibility */}
      <Route path="/checklist">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Checklist />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Project-specific checklist route */}
      <Route path="/project/:projectId/checklist">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <Checklist />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      <Route path="/final-checklist">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <FinalChecklist />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      <Route path="/factor-checklist">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <FactorChecklist />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      <Route path="/projects/:projectId/outcomes">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <OutcomeManagement />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Project Setup Page (for editing project profile) */}
      <Route path="/projects/:projectId/setup">
        {isAuthenticated ? (
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
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <BasicProjectEditPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Basic Project Edit Page with Organization context */}
      <Route path="/organisations/:orgId/projects/:projectId/edit-basic">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <BasicProjectEditPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Project Profile Edit Page - OLD PATH */}
      <Route path="/projects/:projectId/profile/edit">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <ProjectProfile editMode={true} />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Project Detail Page - OLD PATH */}
      <Route path="/projects/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <ProjectPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* NEW ROUTES WITH ORGANIZATION CONTEXT */}
      {/* Project Profile Edit Page with Organization */}
      <Route path="/organisations/:orgId/projects/:projectId/profile/edit">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <ProjectProfile editMode={true} />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Project Detail Page with Organization */}
      <Route path="/organisations/:orgId/projects/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <ProjectPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired />
        )}
      </Route>

      {/* Dashboard route - protected like other tools */}
      <Route path="/dashboard">
        {isAuthenticated ? (
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
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <GoalMappingPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      {/* Cynefin orientation with project ID */}
      <Route path="/tools/cynefin-orientation/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <CynefinOrientationPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      {/* TCOF journey with project ID */}
      <Route path="/tools/tcof-journey/:projectId">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <TCOFJourneyPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      {/* Base routes without project IDs */}
      <Route path="/tools/goal-mapping">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <GoalMappingPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      <Route path="/tools/cynefin-orientation">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <CynefinOrientationPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      <Route path="/tools/tcof-journey">
        {isAuthenticated ? (
          <ProtectedRouteGuard>
            <TCOFJourneyPage />
          </ProtectedRouteGuard>
        ) : (
          <AuthRequired 
            message="You need to sign in to access this tool." 
            showPasswordOption={true} 
          />
        )}
      </Route>

      {/* Test routes */}
      <Route path="/test-factors">
        <SuccessFactorsTest />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// Use existing imports from the top of the file - already imported above
// All providers and components needed are already imported at the top of the file

function App() {
  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProtectionProvider>
          {/* Only enable accessibility audits in development */}
          <A11yAuditProvider disabled={!isDev}>
            <FeedbackProvider>
              <ProgressProvider>
                <PlanProvider>
                  <ProjectProvider>
                    {/* Use AppInitializer to wait for both contexts to hydrate */}
                    <AppInitializer>
                      <AppLayout>
                        <Router />
                        {/* Add the feedback container to display notifications */}
                        <FeedbackContainer />
                      </AppLayout>
                    </AppInitializer>
                  </ProjectProvider>
                </PlanProvider>
              </ProgressProvider>
            </FeedbackProvider>
          </A11yAuditProvider>
        </AuthProtectionProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={true} />
    </QueryClientProvider>
  );
}

export default App