import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
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
                src="/vitruvian-man.png" 
                alt="Vitruvian Man - TCOF" 
                className="max-h-full object-contain"
              />
            </div>
            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-tcof-dark/60 to-transparent text-white text-center z-20">
              <p className="font-medium">Inspired by research from Oxford University's SAID Business School</p>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/tools/starter-access">
              <Button className="bg-tcof-teal hover:bg-tcof-teal/80 text-white text-lg px-8 py-6 rounded-full">
                Get Started Now
              </Button>
            </Link>
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

      {/* Tools for Every Stage Section */}
      <section className="py-16 bg-gradient-to-br from-tcof-light to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-tcof-dark">Tools for Every Stage</h2>
          <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Goal-Mapping Tool */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-md overflow-hidden bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6" y2="6"></line>
                    <line x1="6" y1="18" x2="6" y2="18"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2 text-tcof-dark">Goal-Mapping Tool</h3>
                <p className="text-gray-700 mb-4">Map your strategic, business, and product goals using the Success Map framework</p>
                <div className="mt-auto">
                  <Link href="/">
                    <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10">
                      Explore Tool
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Cynefin Orientation Tool */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-md overflow-hidden bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2 text-tcof-dark">Cynefin Orientation Tool</h3>
                <p className="text-gray-700 mb-4">Determine whether your domain is Clear, Complicated, Complex, or Chaotic</p>
                <div className="mt-auto">
                  <Link href="/">
                    <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10">
                      Explore Tool
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* TCOF Journey Decision Tree */}
            <Card className="border-2 border-tcof-teal/30 hover:border-tcof-teal transition-all duration-300 shadow-md overflow-hidden bg-white">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-tcof-light rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tcof-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2 text-tcof-dark">TCOF Journey Decision Tree</h3>
                <p className="text-gray-700 mb-4">Navigate through the delivery process and determine your current journey stage</p>
                <div className="mt-auto">
                  <Link href="/">
                    <Button variant="outline" className="border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10">
                      Explore Tool
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who Should Use These Tools Section */}
      <section className="py-16 bg-white">
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

      {/* Get Started Section */}
      <section className="py-16 bg-tcof-light">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-tcof-dark">Ready to Get Started?</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8">
            Pick a meaningful project or change initiative you're working on and apply these tools to gain clarity and structure.
          </p>
          <Link href="/tools/starter-access">
            <Button className="bg-tcof-teal hover:bg-tcof-teal/80 text-white text-lg px-8 py-6 rounded-full">
              Access Starter Kit
            </Button>
          </Link>
          <p className="mt-6 text-gray-600">
            You're accessing the Starter Kit. Looking for more advanced tools?
          </p>
          <Link href="/pro-tools">
            <Button variant="outline" className="mt-4 border-tcof-teal text-tcof-teal hover:bg-tcof-teal/10">
              Pro Tools Coming Soon
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
