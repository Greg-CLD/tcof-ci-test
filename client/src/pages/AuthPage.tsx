import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, LogIn, Key } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Create a schema for form validation
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Auth page with username and password login
 */
export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, authError, loginMutation } = useAuth();
  
  // Set up form with react-hook-form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Handle login form submission
  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-tcof-teal" />
        <p className="mt-4 text-gray-600">Checking authentication status...</p>
      </div>
    );
  }
  
  if (user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Form Section */}
            <div>
              <h1 className="text-3xl font-bold text-tcof-dark mb-6">Welcome to TCOF</h1>
              <p className="text-gray-600 mb-8">
                Log in to access your strategic planning tools and saved projects.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {authError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                autoComplete="username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                autoComplete="current-password"
                              />
                            </FormControl>
                            <FormMessage />
                            <FormDescription>
                              Demo credentials: "admin" / "admin123"
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit"
                        className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            Sign In
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-tcof-light to-tcof-light/50 p-8 rounded-lg shadow-sm order-first md:order-last">
              <h2 className="text-2xl font-bold text-tcof-dark mb-6">
                TCOF Strategic Planning Toolkit
              </h2>
              <p className="text-gray-700 mb-6">
                The Connected Outcomes Framework helps teams navigate complex technology projects by providing:
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="bg-tcof-teal/20 p-2 rounded-full mr-3 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tcof-teal">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-tcof-dark">Strategic Goal Mapping</h3>
                    <p className="text-gray-600">Visualize and connect your strategic objectives</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-tcof-teal/20 p-2 rounded-full mr-3 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tcof-teal">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-tcof-dark">Complexity Analysis</h3>
                    <p className="text-gray-600">Identify your domain's complexity level</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-tcof-teal/20 p-2 rounded-full mr-3 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tcof-teal">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-tcof-dark">Success Factor Checklists</h3>
                    <p className="text-gray-600">Build action plans based on proven success factors</p>
                  </div>
                </li>
              </ul>

              <Alert className="bg-tcof-teal/10 border-tcof-teal">
                <AlertDescription>
                  Sign in to save your strategic planning tools and track progress across multiple projects.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}