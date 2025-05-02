import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProTools from "@/pages/ProTools";
import StarterAccess from "@/pages/StarterAccess";
import GetYourBearings from "@/pages/GetYourBearings";
import MakeAPlan from "@/pages/MakeAPlan";
import Checklist from "@/pages/Checklist";
import Pricing from "@/pages/Pricing";
import AuthPage from "@/pages/auth-page";
import UserHistory from "@/pages/UserHistory";
import ProfilePage from "@/pages/ProfilePage";
import Dashboard from "@/pages/Dashboard";
import { AuthProtectionProvider, useAuthProtection } from "@/hooks/use-auth-protection";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Button } from "@/components/ui/button";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Tool components wrapped with layout
const GoalMappingPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <SiteHeader />
    <main className="flex-grow container mx-auto px-4 py-12">
      <GoalMappingTool />
    </main>
    <SiteFooter />
  </div>
);

const CynefinOrientationPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <SiteHeader />
    <main className="flex-grow container mx-auto px-4 py-12">
      <CynefinOrientationTool />
    </main>
    <SiteFooter />
  </div>
);

const TCOFJourneyPage = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <SiteHeader />
    <main className="flex-grow container mx-auto px-4 py-12">
      <TCOFJourneyTool />
    </main>
    <SiteFooter />
  </div>
);

function Router() {
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pro-tools" component={ProTools} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/history" component={UserHistory} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/get-your-bearings" component={GetYourBearings} />
      <Route path="/make-a-plan" component={MakeAPlan} />
      <Route path="/checklist" component={Checklist} />
      
      {/* Dashboard route - protected like other tools */}
      <Route path="/dashboard">
        {isAuthenticated('starter-access') || user ? (
          <Dashboard />
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
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
          <GoalMappingPage />
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
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
          <CynefinOrientationPage />
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
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
          <TCOFJourneyPage />
        ) : (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProtectionProvider>
          <Router />
          <Toaster />
        </AuthProtectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
