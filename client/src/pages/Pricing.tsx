import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Function to handle checkout process for Starter Kit
  const handleStarterCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/checkout-starter", {});
      const data = await response.json();
      console.log("Checkout response:", data);
      
      if (data.url) {
        // Redirect to Stripe Checkout using a link click instead of window.location
        const link = document.createElement('a');
        link.href = data.url;
        link.target = "_blank"; // Open in new tab
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Redirecting to Checkout",
          description: "If the checkout page doesn't open, please check your pop-up blocker settings."
        });
      } else {
        throw new Error("Invalid response from checkout API");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "There was an error initiating checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center">
            <span className="text-tcof-teal text-2xl mr-2">💳</span>
            <h1 className="text-2xl font-bold text-tcof-dark">TCOF Tools Access</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-tcof-dark">Choose Your Plan</h2>
            <p className="text-xl text-gray-600 mb-6">Select the tools package that best fits your needs</p>
            <div className="h-1 w-24 bg-tcof-teal mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Starter Kit Card */}
            <Card className="relative border-2 border-tcof-teal overflow-hidden transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-tcof-teal"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-tcof-dark">Starter Kit</CardTitle>
                <div className="text-3xl font-bold mt-4 text-tcof-dark">£9</div>
                <p className="text-gray-500 text-sm">One-time payment</p>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2 font-bold">✓</span>
                    <span>Goal-Mapping Tool</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2 font-bold">✓</span>
                    <span>Cynefin Orientation Tool</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2 font-bold">✓</span>
                    <span>TCOF Journey Decision Tree</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-tcof-teal mr-2 font-bold">✓</span>
                    <span>Save & export your results</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={handleStarterCheckout}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Processing...
                    </span>
                  ) : (
                    "Get Started Now"
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Pro Tools Card */}
            <Card className="relative border-2 border-gray-200 overflow-hidden transition-all duration-300 opacity-70">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-200"></div>
              <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 px-3 py-1 text-sm font-medium rounded-bl-md">
                Coming Soon
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-gray-600">Pro Tools</CardTitle>
                <div className="text-3xl font-bold mt-4 text-gray-600">£NIL</div>
                <p className="text-gray-500 text-sm">Price TBC</p>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="space-y-2 text-gray-500">
                  <li className="flex items-start">
                    <span className="mr-2 font-bold">✓</span>
                    <span>Everything in Starter Kit</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 font-bold">✓</span>
                    <span>Outcome Canvases</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 font-bold">✓</span>
                    <span>Scenario Planners</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 font-bold">✓</span>
                    <span>Executive Dashboards</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  variant="outline"
                  disabled={true}
                >
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Button
              variant="ghost"
              className="text-tcof-dark"
              onClick={() => setLocation("/")}
            >
              Return to Home
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-600">
            <p>© {new Date().getFullYear()} TCOF Tools. All rights reserved.</p>
            <p className="text-sm mt-2">Secure payment processing by Stripe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}