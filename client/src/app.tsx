import React from 'react';
import { Route, Router, Switch } from 'wouter';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

// Import task debug utilities - this exposes the global taskDebug object
import '@/utils/task-debug';

// Main application components
import AppInitializer from './AppInitializer';
import LandingPage from '@/pages/LandingPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import ProjectCreationPage from '@/pages/ProjectCreationPage';
import AdminSuccessFactorEditor from '@/pages/AdminSuccessFactorEditor';
import MakeAPlanPage from '@/pages/MakeAPlanPage';
import MakeAPlanChecklistPage from '@/pages/MakeAPlanChecklistPage';
import OrganisationsPage from '@/pages/OrganisationsPage';
import OrganisationDashboardPage from '@/pages/OrganisationDashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import ProjectProfilePage from '@/pages/ProjectProfilePage';
import UnauthenticatedPage from '@/pages/UnauthenticatedPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { AuthProvider } from '@/hooks/useAuth';
import Breadcrumb from './components/navigation/Breadcrumb';
import SiteHeader from './components/navigation/SiteHeader';
import { AppFooter } from './components/layout/AppFooter';
import { ThemeProvider } from './components/theme/theme-provider';
import { ProtectedRouteGuard } from './components/auth/ProtectedRouteGuard';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="confluity-theme">
        <AuthProvider>
          <Router>
            <AppInitializer>
              <div className="min-h-screen flex flex-col">
                <SiteHeader />
                <Breadcrumb />
                <div className="flex-1">
                  <Switch>
                    {/* Public routes */}
                    <Route path="/" component={LandingPage} />
                    <Route path="/unauthenticated" component={UnauthenticatedPage} />
                    
                    {/* Protected routes */}
                    <Route path="/all-projects">
                      <ProtectedRouteGuard>
                        <ProjectsPage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/projects/new">
                      <ProtectedRouteGuard>
                        <ProjectCreationPage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/projects/:projectId">
                      {params => (
                        <ProtectedRouteGuard routeProjectId={params.projectId}>
                          <ProjectDetailPage projectId={params.projectId} />
                        </ProtectedRouteGuard>
                      )}
                    </Route>
                    
                    <Route path="/projects/:projectId/profile">
                      {params => (
                        <ProtectedRouteGuard routeProjectId={params.projectId}>
                          <ProjectProfilePage projectId={params.projectId} />
                        </ProtectedRouteGuard>
                      )}
                    </Route>
                    
                    <Route path="/organisations">
                      <ProtectedRouteGuard>
                        <OrganisationsPage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/organisations/:organisationId">
                      {params => (
                        <ProtectedRouteGuard>
                          <OrganisationDashboardPage organisationId={params.organisationId} />
                        </ProtectedRouteGuard>
                      )}
                    </Route>
                    
                    <Route path="/make-a-plan">
                      <ProtectedRouteGuard>
                        <MakeAPlanPage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/make-a-plan/checklist">
                      <ProtectedRouteGuard>
                        <MakeAPlanChecklistPage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/admin/factors">
                      <ProtectedRouteGuard>
                        <AdminSuccessFactorEditor />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    <Route path="/profile">
                      <ProtectedRouteGuard>
                        <ProfilePage />
                      </ProtectedRouteGuard>
                    </Route>
                    
                    {/* Catch-all 404 route */}
                    <Route component={NotFoundPage} />
                  </Switch>
                </div>
                <AppFooter />
              </div>
              
              {/* Toaster for notifications */}
              <Toaster />
            </AppInitializer>
          </Router>
        </AuthProvider>
      </ThemeProvider>
      
      {/* Development tools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;