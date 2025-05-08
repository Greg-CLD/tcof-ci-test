import { useAuth } from "@/contexts/AuthContext";
import { LoginButton } from "@/components/auth-buttons";
import { Redirect } from "wouter";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  
  // If user is already logged in, redirect to home
  if (user && !isLoading) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left column with form */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-tcof-primary">Welcome to TCOF Toolkit</h2>
          <p className="text-gray-600 mb-8">
            Sign in to manage your organizations and projects
          </p>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <LoginButton />
              <p className="text-sm text-gray-500 mt-4 text-center">
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-tcof-primary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-tcof-primary hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right column with hero section */}
      <div className="hidden md:flex md:w-1/2 bg-tcof-primary justify-center items-center">
        <div className="max-w-md p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Transform your digital project success
          </h2>
          <p className="mb-6">
            The Connected Outcomes Framework Toolkit helps you manage digital projects
            with proven methodologies, structured planning, and predictable outcomes.
          </p>
          <ul className="space-y-2 mb-8">
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Goal mapping with success factors
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Project contextual awareness
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Customizable task management
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}