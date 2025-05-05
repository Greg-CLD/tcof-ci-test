import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle successful login redirects
  useEffect(() => {
    if (user) {
      // The useEffect prevents redirect during render
      setLocation("/organisations");
    }
  }, [user, setLocation]);
  
  // Handle login/register mutations
  const onLoginSubmit = (data: LoginFormValues) => {
    // First try to login
    loginMutation.mutate(data, {
      onSuccess: () => setLocation("/organisations"),
      onError: () => {
        // If login fails, try to register with the same credentials
        registerMutation.mutate({
          username: data.username,
          password: data.password,
        }, {
          onSuccess: () => setLocation("/organisations")
        });
      }
    });
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Authentication Form */}
          <div className="flex flex-col justify-center">
            <div className="mx-auto w-full max-w-md">
              <h2 className="text-3xl font-bold text-tcof-dark text-center mb-6">
                Sign In
              </h2>

              <Card>
                <CardHeader>
                  <CardTitle>Access your work</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="text-sm text-gray-500 my-2">
                        <p>If you're logging in for the first time, an account will be created automatically.</p>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        disabled={loginMutation.isPending || registerMutation.isPending}
                      >
                        {loginMutation.isPending || registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {registerMutation.isPending ? "Creating account..." : "Signing in..."}
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Hero Section */}
          <div className="hidden md:flex flex-col justify-center bg-tcof-light p-10 rounded-lg">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-tcof-dark mb-4">
                The Connected Outcomes Framework
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Strategic planning tools for complex delivery environments
              </p>
              <div className="w-20 h-1 bg-tcof-teal mx-auto rounded-full"></div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-tcof-teal/10 p-3 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-tcof-teal"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-tcof-dark">
                    Goal Mapping
                  </h3>
                  <p className="text-gray-600">
                    Create visual maps of your strategic goals
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-tcof-teal/10 p-3 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-tcof-teal"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-tcof-dark">
                    Cynefin Framework
                  </h3>
                  <p className="text-gray-600">
                    Identify your domain and determine the best approach
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-tcof-teal/10 p-3 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-tcof-teal"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-tcof-dark">
                    TCOF Journey
                  </h3>
                  <p className="text-gray-600">
                    Navigate through your project implementation stages
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-700 italic">
                "Your work is saved across all your devices, so you can access it anytime, anywhere."
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}