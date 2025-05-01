import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import PasswordProtection from "@/components/PasswordProtection";

export default function StarterAccess() {
  const [, setLocation] = useLocation();
  const [sessionVerified, setSessionVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAuthenticated } = useAuthProtection();
  
  // Parse the session_id from the URL if present
  useEffect(() => {
    const query = window.location.search;
    const params = new URLSearchParams(query);
    const sessionId = params.get("session_id");
    
    if (sessionId) {
      // Verify session with backend if needed in a production app
      // For demo purposes, we'll simulate verification with a timeout
      setTimeout(() => {
        setSessionVerified(true);
        setIsLoading(false);
      }, 1000);
    } else {
      setIsLoading(false);
    }
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-4 border-tcof-teal border-t-transparent rounded-full mb-4"></div>
        <p className="text-tcof-dark">Verifying your access...</p>
      </div>
    );
  }
  
  // If the user is not authenticated, show the password protection screen
  if (!isAuthenticated('starter-access') && !sessionVerified) {
    return (
      <PasswordProtection 
        pageName="starter-access"
        pageTitle="TCOF Starter Kit Access"
        pageDescription="Enter your password to access the TCOF Starter Kit tools"
      />
    );
  }
  
  // For users who haven't purchased yet (no session and not authenticated)
  if (!sessionVerified && !isAuthenticated('starter-access')) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center">
              <span className="text-tcof-teal text-2xl mr-2">🔑</span>
              <h1 className="text-2xl font-bold text-tcof-dark">TCOF Starter Kit Access</h1>
            </div>
          </div>
        </header>
        
        <main className="flex-grow container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Access Required</h2>
                <p className="text-gray-600 mb-8">
                  This page requires a valid payment session. Purchase the Starter Kit to access these tools.
                </p>
                
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-tcof-teal text-2xl mr-2">🔑</span>
            <h1 className="text-2xl font-bold text-tcof-dark">TCOF Starter Kit Access</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="text-tcof-dark">
              Return to Home
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-tcof-light rounded-xl p-8 mb-8 text-center">
            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
              Payment Successful
            </div>
            <h2 className="text-3xl font-bold text-tcof-dark mb-3">Thank You for Your Purchase!</h2>
            <p className="text-xl text-gray-700 mb-4">
              You now have full access to the TCOF Starter Kit tools
            </p>
            <div className="h-1 w-24 bg-tcof-teal mx-auto rounded-full mt-6"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-2 border-tcof-teal">
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-3 text-tcof-dark">Your Starter Kit Includes:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2">✓</span>
                    <span>Goal-Mapping Tool with interactive canvas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2">✓</span>
                    <span>Cynefin Orientation Diagram</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2">✓</span>
                    <span>TCOF Journey Decision Tree</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2">✓</span>
                    <span>Export and save your results</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-3 text-tcof-dark">Getting Started</h3>
                <p className="text-gray-600 mb-4">
                  We recommend following this sequence to get the most from your tools:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                  <li>Map your goals using the Goal-Mapping Canvas</li>
                  <li>Determine your domain using the Cynefin Tool</li>
                  <li>Plot your position in the TCOF Journey</li>
                </ol>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mb-8">
            <Link href="/">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                Start Using Your Tools
              </Button>
            </Link>
          </div>
          
          <Separator className="my-8" />
          
          <div className="text-center text-gray-500 text-sm">
            <p>
              Need help? Contact us at support@tcofpro.com
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}