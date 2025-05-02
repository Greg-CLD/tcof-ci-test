import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { useToast } from "@/hooks/use-toast";
import { Compass, ClipboardCheck, FileDown, Lock, ArrowRight, MapPin, Lightbulb } from "lucide-react";
import { 
  STORAGE_KEYS, 
  loadFromLocalStorage, 
  GoalMapData, 
  CynefinSelection, 
  TCOFJourneyData 
} from "@/lib/storage";
import { generateCompletePDF } from "@/lib/pdf-utils";
import vitruvianMan from "../assets/vitruvian-man.png";

export default function Home() {
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
  
  return (
    <div className="min-h-screen flex flex-col bg-tcof-light text-tcof-dark">
      <SiteHeader />
      
      {/* Hero Section */}
      <header className="bg-gradient-to-b from-white to-tcof-light py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-tcof-dark to-tcof-teal inline-block text-transparent bg-clip-text">
            The Connected Outcomes Framework: 
            <span className="block mt-2">Your Toolkit for Delivering Impactful Change</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-10">
            Navigate complexity, align teams, and deliver successful outcomes with our evidence-based toolkit
          </p>
          <div className="relative h-64 md:h-96 max-w-5xl mx-auto my-12 bg-tcof-dark/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-tcof-teal/20 to-tcof-dark/20 z-10"></div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <img 
                src={vitruvianMan} 
                alt="Vitruvian Man - TCOF" 
                className="max-h-full object-contain"
              />
            </div>
            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-tcof-dark/60 to-transparent text-white text-center z-20">
              <p className="font-medium">Inspired by research from Oxford University's SAID Business School</p>
            </div>
          </div>
        </div>
      </header>

      {/* Why These Tools Exist Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-tcof-dark">Why These Tools Exist</h2>
            <div className="h-1 w-20 bg-tcof-teal mx-auto mb-10"></div>
            <p className="text-lg md:text-xl text-gray-700 mb-6">
              Delivering complex change is fundamentally a human challenge. Research shows that up to 70% of 
              transformation initiatives fail, not because of technology or resources, but due to human 
              factors like alignment, communication, and adaptability.
            </p>
            <p className="text-lg md:text-xl text-gray-700">
              The Connected Outcomes Framework provides a structured approach to navigate these challenges, 
              incorporating insights from Oxford University's SAID Business School on successful change delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Main Decision Section - Two Cards */}
      <section className="py-16 bg-gradient-to-br from-tcof-light to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-tcof-dark">
            What Would You Like To Do?
          </h2>
          <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Get Your Bearings Card */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 flex flex-col items-center justify-center">
                  <Compass className="h-24 w-24 text-tcof-teal mb-4" />
                  <h3 className="text-2xl font-bold text-tcof-dark">Get Your Bearings</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Use our assessment tools to understand where you are and what you're trying to achieve.
                    Includes the Goal Mapping Tool, Cynefin Orientation Tool, and TCOF Journey Decision Tree.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <MapPin className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                      <span className="text-gray-600">Map out your strategic goals and desired outcomes</span>
                    </li>
                    <li className="flex items-start">
                      <Compass className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                      <span className="text-gray-600">Identify your domain's complexity level</span>
                    </li>
                    <li className="flex items-start">
                      <Lightbulb className="h-5 w-5 text-tcof-teal shrink-0 mt-0.5 mr-2" />
                      <span className="text-gray-600">Determine your current journey stage</span>
                    </li>
                  </ul>
                  <Link href="/get-your-bearings">
                    <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Get Your Bearings <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Make a Plan Card */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-8 flex flex-col items-center justify-center">
                  <ClipboardCheck className="h-24 w-24 text-tcof-teal mb-4" />
                  <h3 className="text-2xl font-bold text-tcof-dark">Make a Plan</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-6">
                    Create a structured action plan for your transformation or delivery initiative 
                    using our step-by-step planning tool. Turn insights into actionable steps.
                  </p>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                    <p className="text-amber-800 text-sm">
                      <strong>Recommendation:</strong> Complete the "Get Your Bearings" step first for best results.
                    </p>
                  </div>
                  <div className="space-y-2 mb-6">
                    <p className="text-tcof-dark font-medium">Coming soon features:</p>
                    <p className="text-sm text-gray-600">• Stakeholder mapping</p>
                    <p className="text-sm text-gray-600">• Risk assessment templates</p>
                    <p className="text-sm text-gray-600">• Action planning framework</p>
                  </div>
                  <Link href="/make-a-plan">
                    <Button className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                      Make a Plan <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PDF Export Feature */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border border-tcof-teal/30 bg-tcof-light/50 shadow-md">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center">
                  <FileDown className="h-6 w-6 text-tcof-teal mr-2" />
                  <h3 className="font-bold text-xl text-tcof-dark">Complete Part B Plan</h3>
                </div>
                <p className="text-gray-600 mb-4 mt-2">
                  After using all three assessment tools, generate a complete Part B Plan PDF that combines all your inputs.
                </p>
                
                <Button 
                  onClick={handleGenerateCompletePDF}
                  variant="outline" 
                  className="bg-white hover:bg-tcof-light text-tcof-dark border-tcof-teal flex items-center mx-auto"
                >
                  <FileDown className="h-4 w-4 mr-2" /> Generate Complete PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who Should Use These Tools Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-tcof-dark">Who Should Use These Tools?</h2>
          <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Individuals */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-tcof-dark">Individuals</h3>
              <p className="text-gray-700">
                Project managers, change leaders, and consultants seeking to structure their approach to complex change initiatives
              </p>
            </div>
            
            {/* Teams */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-tcof-dark">Teams</h3>
              <p className="text-gray-700">
                Cross-functional teams that need alignment on goals, context, and delivery approach for critical projects
              </p>
            </div>
            
            {/* Organizations */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-tcof-light rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-tcof-dark">Organizations</h3>
              <p className="text-gray-700">
                Businesses undergoing transformation who want a standardized framework for planning and executing changes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Banner */}
      <section className="py-12 bg-gradient-to-r from-tcof-dark to-tcof-teal">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl text-white font-bold mb-4">Ready to Start?</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Pick a meaningful project or change initiative you're working on and apply our tools to gain clarity and structure.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/get-your-bearings">
              <Button className="bg-white text-tcof-dark hover:bg-gray-100">
                Get Your Bearings <Compass className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pro-tools">
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                Learn About Pro Tools <Lock className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <SiteFooter />
    </div>
  );
}