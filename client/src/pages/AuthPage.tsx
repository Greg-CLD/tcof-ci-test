import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import SiteHeader from "@/components/SiteHeader";
import { useToast } from "@/hooks/use-toast";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Registration form schema with password confirmation
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, checkAccountExists } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [accountCheckStatus, setAccountCheckStatus] = useState<{
    checked: boolean;
    exists: boolean;
    message: string;
    username?: string | null;
  }>({
    checked: false,
    exists: false,
    message: ""
  });
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: accountCheckStatus.username || "",
      password: "",
    },
  });

  // Update login form when account check finds a username
  useEffect(() => {
    if (accountCheckStatus.username) {
      loginForm.setValue("username", accountCheckStatus.username);
    }
  }, [accountCheckStatus.username, loginForm]);

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Function to check if account exists
  const checkAccount = async (email: string) => {
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address to check",
        variant: "destructive"
      });
      return;
    }
    
    setIsCheckingAccount(true);
    
    try {
      const result = await checkAccountExists(email);
      
      setAccountCheckStatus({
        checked: true,
        exists: result.exists,
        message: result.message,
        username: result.username
      });
      
      // If the account exists, switch to login tab
      if (result.exists && result.username) {
        setActiveTab("login");
        loginForm.setValue("username", result.username);
        toast({
          title: "Account Found",
          description: `We found your account with username ${result.username}. Please log in with your password.`,
          variant: "default"
        });
      } else if (!result.exists) {
        toast({
          title: "Email Available",
          description: "This email is available for registration. Please complete the form.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error checking account:", error);
      toast({
        title: "Error",
        description: "Failed to check if account exists",
        variant: "destructive"
      });
    } finally {
      setIsCheckingAccount(false);
    }
  };

  // Handle email field blur to check account
  const handleEmailBlur = async (email: string) => {
    if (email && email.includes('@')) {
      await checkAccount(email);
    }
  };

  // Handle login submission
  const onLoginSubmit = (data: LoginFormValues) => {
    if (loginMutation) {
      loginMutation.mutate(data);
    }
  };

  // Handle registration submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    if (registerMutation) {
      // Omit confirmPassword as it's not needed in the API
      const { confirmPassword, ...registerData } = data;
      // ID will be generated in the registerMutation
      registerMutation.mutate(registerData);
    }
  };

  // Redirect to home if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Form Section */}
            <div>
              <h1 className="text-3xl font-bold text-tcof-dark mb-6">Welcome Back</h1>
              <p className="text-gray-600 mb-8">
                Log in to access your strategic planning tools and saved projects.
              </p>

              <Tabs 
                defaultValue="login" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="login">Log In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <Card>
                    <CardHeader>
                      <CardTitle>Log In</CardTitle>
                      <CardDescription>
                        Enter your credentials to access your account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
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
                                  <Input type="password" placeholder="Enter your password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                            disabled={loginMutation?.isPending}
                          >
                            {loginMutation?.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                              </>
                            ) : (
                              <>
                                <LogIn className="mr-2 h-4 w-4" />
                                Log In
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col">
                      <div className="flex items-center justify-between w-full">
                        <p className="text-sm text-gray-500">
                          Don't have an account?
                        </p>
                        <Button 
                          variant="link" 
                          onClick={() => setActiveTab("register")}
                          className="text-tcof-teal p-0"
                        >
                          Create Account
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>

                {/* Register Form */}
                <TabsContent value="register">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Account</CardTitle>
                      <CardDescription>
                        Register for a new account to get started
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="Choose a username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <div className="flex space-x-2">
                                  <FormControl>
                                    <Input 
                                      type="email" 
                                      placeholder="Enter your email" 
                                      {...field} 
                                      onBlur={() => handleEmailBlur(field.value)}
                                    />
                                  </FormControl>
                                  {field.value && field.value.includes('@') && (
                                    <Button 
                                      type="button"
                                      variant="outline"
                                      className="shrink-0"
                                      onClick={() => checkAccount(field.value)}
                                      disabled={isCheckingAccount}
                                    >
                                      {isCheckingAccount ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        'Check'
                                      )}
                                    </Button>
                                  )}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Account check status alerts */}
                          {accountCheckStatus.checked && (
                            <Alert className={accountCheckStatus.exists ? 
                              "bg-amber-50 border-amber-500" : 
                              "bg-green-50 border-green-500"
                            }>
                              {accountCheckStatus.exists ? (
                                <>
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                  <AlertTitle className="text-amber-800">Account Already Exists</AlertTitle>
                                  <AlertDescription className="text-amber-700">
                                    An account with this email already exists. We've switched to the login tab with your username. Please enter your password to continue.
                                  </AlertDescription>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <AlertTitle className="text-green-800">Email Available</AlertTitle>
                                  <AlertDescription className="text-green-700">
                                    This email is available for registration. Please complete the form to create your account.
                                  </AlertDescription>
                                </>
                              )}
                            </Alert>
                          )}
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Create a password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm your password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                            disabled={registerMutation?.isPending}
                          >
                            {registerMutation?.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create Account
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col">
                      <div className="flex items-center justify-between w-full">
                        <p className="text-sm text-gray-500">
                          Already have an account?
                        </p>
                        <Button 
                          variant="link" 
                          onClick={() => setActiveTab("login")}
                          className="text-tcof-teal p-0"
                        >
                          Log In
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
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
                  Create an account to save your strategic planning tools and track progress across multiple projects.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}