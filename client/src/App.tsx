import { Switch, Route, Link, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
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
import Block1Discover from "@/pages/Block1Discover";
import Block2Design from "@/pages/Block2Design";
import Block3Deliver from "@/pages/Block3Deliver";
import Block3Complete from "@/pages/Block3Complete";
import Checklist from "@/pages/Checklist";
import FactorChecklist from "@/pages/FactorChecklist";
import Pricing from "@/pages/Pricing";
import AuthPage from "@/pages/auth-page";
import UserHistory from "@/pages/UserHistory";
import ProfilePage from "@/pages/ProfilePage";
import ProjectProfile from "@/pages/ProjectProfile";
import Dashboard from "@/pages/Dashboard";
import OutcomeManagement from "@/pages/OutcomeManagement";
import OrganisationListPage from "@/pages/OrganisationListPage";
import OrganisationDashboardPage from "@/pages/OrganisationDashboardPage";
import TestAuth from "@/pages/TestAuth";
import { AuthProtectionProvider, useAuthProtection } from "@/hooks/use-auth-protection";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProgressProvider } from "@/hooks/use-progress";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProtectedRouteGuard } from "@/components/ProtectedRouteGuard";
import { Button } from "@/components/ui/button";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import GlobalNav from "@/components/GlobalNav";
import Breadcrumb from "@/components/Breadcrumb";
import ProjectBanner from "@/components/ProjectBanner";

// Tool components wrapped with layout
const GoalMappingPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <main className="flex-grow container mx-auto px-4 py-12">
      <GoalMappingTool />
    </main>
    <SiteFooter />
  </div>
);

const CynefinOrientationPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <main className="flex-grow container mx-auto px-4 py-12">
      <CynefinOrientationTool />
    </main>
    <SiteFooter />
  </div>
);

const TCOFJourneyPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <main className="flex-grow container mx-auto px-4 py-12">
      <TCOFJourneyTool />
    </main>
    <SiteFooter />
  </div>
);

function Router() {
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Use useEffect for redirects to avoid React render-phase updates
  useEffect(() => {
    // Extract org ID from location if present
    const orgIdMatch = location.match(/\/organisations\/([^\/]+)/);
    const orgIdParam = orgIdMatch ? orgIdMatch[1] : null;
    
    // If user is authenticated and at home route, redirect to organisations
    if (user && location === '/') {
      navigate("/organisations");
      return;
    }
    
    // Allow user to access organization list and dashboard if authenticated
    if (user && location === '/organisations') {
      // let them use the org list
      return;
    }
    
    if (user && orgIdParam && location === `/organisations/${orgIdParam}`) {
      // allow dashboard
      return;
    }
    
    // If user is not authenticated and tries to access restricted routes
    if (!user && (location === '/organisations' || location.startsWith('/organisations/'))) {
      navigate("/");
    }
  }, [user, location, navigate]);
  
  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      
      {/* Organizations management - authenticated users only */}
      <Route path="/organisations">
        {user ? (
          <ProtectedRouteGuard>
            <OrganisationListPage />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to sign in to access this page.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                    onClick={() => navigate("/auth")}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </main>
            <SiteFooter />
          </div>
        )}
      </Route>
      
      {/* Organisation Dashboard - authenticated users only */}
      <Route path="/organisations/:orgId">
        {user ? (
          <ProtectedRouteGuard>
            <OrganisationDashboardPage />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to sign in to access this page.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                    onClick={() => navigate("/auth")}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </main>
            <SiteFooter />
          </div>
        )}
      </Route>
      
      <Route path="/pro-tools" component={ProTools} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/test-auth" component={TestAuth} />
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/history" component={UserHistory} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/get-your-bearings" component={GetYourBearings} />
      <Route path="/get-your-bearings/project-profile" component={ProjectProfile} />
      <Route path="/make-a-plan">
        <ProtectedRouteGuard>
          <MakeAPlan />
        </ProtectedRouteGuard>
      </Route>
      <Route path="/make-a-plan/landing">
        <ProtectedRouteGuard>
          <MakeAPlanLanding />
        </ProtectedRouteGuard>
      </Route>
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
      <Route path="/make-a-plan/admin" component={AdminPresetEditor} />
      <Route path="/make-a-plan/admin/factors" component={AdminFactorEditor} />
      <Route path="/make-a-plan/admin/graph-explorer" component={GraphExplorer} />
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
      
      {/* Dashboard route - protected like other tools */}
      <Route path="/dashboard">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <Dashboard />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to sign in to access your dashboard.</p>
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
            </main>
            <SiteFooter />
          </div>
        )}
      </Route>
      
      {/* Protected routes with dual authentication (old password system + new database auth) */}
      <Route path="/tools/goal-mapping">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <GoalMappingPage />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to purchase a license or sign in to access this tool.</p>
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
            </main>
            <SiteFooter />
          </div>
        )}
      </Route>
      
      <Route path="/tools/cynefin-orientation">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <CynefinOrientationPage />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to purchase a license or sign in to access this tool.</p>
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
            </main>
            <SiteFooter />
          </div>
        )}
      </Route>
      
      <Route path="/tools/tcof-journey">
        {isAuthenticated('starter-access') || user ? (
          <ProtectedRouteGuard>
            <TCOFJourneyPage />
          </ProtectedRouteGuard>
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <main className="flex-grow container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">You need to purchase a license or sign in to access this tool.</p>
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
            </main>
            <SiteFooter />
          </div>
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
                  <div className="flex flex-col min-h-screen">
                    <SiteHeader />
                    <Breadcrumb />
                    <ProjectBanner />
                    <div className="flex-grow">
                      <Router />
                    </div>
                    <Toaster />
                  </div>
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
