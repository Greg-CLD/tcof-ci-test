import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ProTools from "@/pages/ProTools";
import StarterAccess from "@/pages/StarterAccess";
import Pricing from "@/pages/Pricing";
import { AuthProtectionProvider } from "@/hooks/use-auth-protection";
import GoalMappingTool from "@/components/GoalMappingTool";
import CynefinOrientationTool from "@/components/CynefinOrientationTool";
import TCOFJourneyTool from "@/components/TCOFJourneyTool";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pro-tools" component={ProTools} />
      <Route path="/tools/starter-access" component={StarterAccess} />
      <Route path="/tools/goal-mapping" component={() => (
        <div className="min-h-screen flex flex-col bg-white">
          <SiteHeader />
          <main className="flex-grow container mx-auto px-4 py-12">
            <GoalMappingTool />
          </main>
          <SiteFooter />
        </div>
      )} />
      <Route path="/tools/cynefin-orientation" component={() => (
        <div className="min-h-screen flex flex-col bg-white">
          <SiteHeader />
          <main className="flex-grow container mx-auto px-4 py-12">
            <CynefinOrientationTool />
          </main>
          <SiteFooter />
        </div>
      )} />
      <Route path="/tools/tcof-journey" component={() => (
        <div className="min-h-screen flex flex-col bg-white">
          <SiteHeader />
          <main className="flex-grow container mx-auto px-4 py-12">
            <TCOFJourneyTool />
          </main>
          <SiteFooter />
        </div>
      )} />
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
