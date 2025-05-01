import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProTools from "@/pages/ProTools";
import StarterAccess from "@/pages/StarterAccess";
import Pricing from "@/pages/Pricing";
import { AuthProtectionProvider, useAuthProtection } from "@/hooks/use-auth-protection";
import { Button } from "@/components/ui/button";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pro-tools" component={ProTools} />
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/tools/goal-mapping" component={() => {
        const { isAuthenticated } = useAuthProtection();
        
        // If not authenticated, redirect to starter access
        if (!isAuthenticated('starter-access')) {
          return (
            <div className="min-h-screen flex flex-col bg-white">
              <SiteHeader />
              <main className="flex-grow container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                  <p className="text-gray-600 mb-6">You need to purchase a license and sign in to access this tool.</p>
                  <Link href="/tools/starter-access">
                    <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </main>
              <SiteFooter />
            </div>
          );
        }
        
        return (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
            <main className="flex-grow container mx-auto px-4 py-12">
              <GoalMappingTool />
            </main>
            <SiteFooter />
          </div>
        );
      }} />
      <Route path="/tools/cynefin-orientation" component={() => {
        const { isAuthenticated } = useAuthProtection();
        
        // If not authenticated, redirect to starter access
        if (!isAuthenticated('starter-access')) {
          return (
            <div className="min-h-screen flex flex-col bg-white">
              <SiteHeader />
              <main className="flex-grow container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                  <p className="text-gray-600 mb-6">You need to purchase a license and sign in to access this tool.</p>
                  <Link href="/tools/starter-access">
                    <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </main>
              <SiteFooter />
            </div>
          );
        }
        
        return (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
            <main className="flex-grow container mx-auto px-4 py-12">
              <CynefinOrientationTool />
            </main>
            <SiteFooter />
          </div>
        );
      }} />
      <Route path="/tools/tcof-journey" component={() => {
        const { isAuthenticated } = useAuthProtection();
        
        // If not authenticated, redirect to starter access
        if (!isAuthenticated('starter-access')) {
          return (
            <div className="min-h-screen flex flex-col bg-white">
              <SiteHeader />
              <main className="flex-grow container mx-auto px-4 py-12">
                <div className="max-w-2xl mx-auto text-center">
                  <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
                  <p className="text-gray-600 mb-6">You need to purchase a license and sign in to access this tool.</p>
                  <Link href="/tools/starter-access">
                    <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </main>
              <SiteFooter />
            </div>
          );
        }
        
        return (
          <div className="min-h-screen flex flex-col bg-white">
            <SiteHeader />
            <main className="flex-grow container mx-auto px-4 py-12">
              <TCOFJourneyTool />
            </main>
            <SiteFooter />
          </div>
        );
      }} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProtectionProvider>
        <Router />
        <Toaster />
      </AuthProtectionProvider>
    </QueryClientProvider>
  );
}

export default App;
