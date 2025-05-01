import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import PasswordProtection from "@/components/PasswordProtection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useToast } from "@/hooks/use-toast";
import { FileDown } from "lucide-react";
import { 
  STORAGE_KEYS, 
  loadFromLocalStorage, 
  GoalMapData, 
  CynefinSelection, 
  TCOFJourneyData 
} from "@/lib/storage";
import { generateCompletePDF } from "@/lib/pdf-utils";

export default function StarterAccess() {
  const [, setLocation] = useLocation();
  const [sessionVerified, setSessionVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAuthenticated } = useAuthProtection();
  const { toast } = useToast();
  
  // Handle generating a complete Part B Plan PDF with all tool data
  const handleGenerateCompletePDF = () => {
    try {
      // Load data from localStorage for each tool
      const goalMapData = loadFromLocalStorage<GoalMapData>(STORAGE_KEYS.GOAL_MAP);
      const cynefinSelection = loadFromLocalStorage<CynefinSelection>(STORAGE_KEYS.CYNEFIN_SELECTION);
      const tcofJourneyData = loadFromLocalStorage<TCOFJourneyData>(STORAGE_KEYS.TCOF_JOURNEY);
      
      // Generate the complete PDF with all tool data
      generateCompletePDF(goalMapData, cynefinSelection, tcofJourneyData);
      
      toast({
        title: "Complete PDF Generated",
        description: "Your TCOF Part B Plan has been generated as a PDF."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was a problem creating your PDF. Please try again.",
        variant: "destructive"
      });
    }
  };
  
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
        <SiteHeader />
        
        <main className="flex-grow container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-tcof-dark mb-4">Access Required</h2>
                <p className="text-gray-600 mb-8">
                  This page requires a valid payment session. Purchase the Starter Kit to access these tools.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setLocation("/pricing")}
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  >
                    Register & Pay Now
                  </Button>
                  
                  <Button
                    onClick={() => setLocation("/")}
                    variant="outline"
                    className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                  >
                    Return to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <SiteFooter />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
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
          
          <div className="mb-8">
            <Card className="border border-tcof-teal/30 bg-tcof-light/50">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg mb-2 text-tcof-dark">Complete Part B Plan</h3>
                <p className="text-gray-600 mb-4">
                  After using all three tools, generate a complete Part B Plan PDF that combines all your inputs.
                </p>
                <Button 
                  onClick={handleGenerateCompletePDF}
                  variant="outline" 
                  className="bg-white hover:bg-tcof-light text-tcof-dark border-tcof-teal flex items-center mx-auto"
                >
                  <FileDown className="h-4 w-4 mr-2" /> Generate Complete Part B Plan
                </Button>
              </CardContent>
            </Card>
            
            <div className="text-center mt-6">
              <Link href="/">
                <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                  Start Using Your Tools
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}