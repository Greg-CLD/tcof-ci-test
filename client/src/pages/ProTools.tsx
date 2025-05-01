import React from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import PasswordProtection from "@/components/PasswordProtection";

export default function ProTools() {
  const { isAuthenticated } = useAuthProtection();
  
  // If not authenticated, show password protection screen
  if (!isAuthenticated('pro-tools')) {
    return (
      <PasswordProtection 
        pageName="pro-tools"
        pageTitle="TCOF Pro Tools Access"
        pageDescription="Enter your password to access premium TCOF tools"
      />
    );
  }
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-tcof-teal text-2xl mr-2">🔒</span>
            <h1 className="text-2xl font-bold text-tcof-dark">TCOF Pro Tools Access</h1>
          </div>
          <Link href="/">
            <Button variant="outline" className="text-tcof-dark">
              Back to Starter Kit
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-tcof-dark">Welcome to Pro Tools Access</h2>
            <p className="text-xl text-gray-600 mb-6">Your premium tools are nearly ready…</p>
            <div className="h-1 w-24 bg-tcof-teal mx-auto rounded-full"></div>
          </div>
          
          <div className="bg-tcof-light p-6 rounded-xl mb-12 text-center">
            <p className="text-gray-700">
              This space is currently under construction. You'll receive an email as soon as your tools are ready.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Outcome Canvases */}
            <Card className="border-2 border-gray-200 hover:border-tcof-teal transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-tcof-dark">Outcome Canvases</h3>
                <p className="text-gray-600">Map your outcomes to business value with interactive canvases</p>
                <div className="mt-4 bg-gray-100 text-gray-500 text-sm px-3 py-1 rounded-full">Coming Soon</div>
              </CardContent>
            </Card>
            
            {/* Scenario Planners */}
            <Card className="border-2 border-gray-200 hover:border-tcof-teal transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-tcof-dark">Scenario Planners</h3>
                <p className="text-gray-600">Model different scenarios and pathways to your desired outcomes</p>
                <div className="mt-4 bg-gray-100 text-gray-500 text-sm px-3 py-1 rounded-full">Coming Soon</div>
              </CardContent>
            </Card>
            
            {/* Executive Dashboards */}
            <Card className="border-2 border-gray-200 hover:border-tcof-teal transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <h3 className="font-bold text-xl mb-2 text-tcof-dark">Executive Dashboards</h3>
                <p className="text-gray-600">Visualize your strategic progress in real-time for stakeholders</p>
                <div className="mt-4 bg-gray-100 text-gray-500 text-sm px-3 py-1 rounded-full">Coming Soon</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Link href="/">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                Return to Starter Kit Tools
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600">
            <p>© {new Date().getFullYear()} TCOF Pro Tools. All rights reserved.</p>
            <p className="text-sm mt-2">You're receiving access to these tools as part of your premium membership.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}