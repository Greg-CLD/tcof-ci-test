import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ClipboardList, ArrowRight } from "lucide-react";

export default function Checklist() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-tcof-dark text-center">Your Action Checklist</h1>
          
          <Card className="border-2 border-tcof-teal/30 shadow-md bg-tcof-light/20 mb-8">
            <CardContent className="p-8 text-center">
              <ClipboardList className="h-16 w-16 text-tcof-teal mx-auto mb-4" />
              <h2 className="text-xl font-bold text-tcof-dark mb-4">Start a Plan to See Your Checklist</h2>
              <p className="text-gray-600 mb-6">
                Your action checklist will appear here once you've started creating a plan. 
                The checklist adapts based on your specific situation and helps you track progress.
              </p>
              <Link href="/make-a-plan">
                <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                  Create Your Plan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-tcof-dark mb-2">What will appear in your checklist?</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 pl-4">
                <li>Recommended actions based on your project stage</li>
                <li>Specific guidance for your domain complexity</li>
                <li>Custom tasks aligned with your strategic goals</li>
                <li>Stakeholder engagement plans tailored to your context</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-tcof-dark mb-2">How to use the checklist:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 pl-4">
                <li>First, complete the "Get Your Bearings" activities</li>
                <li>Create a plan using the "Make a Plan" guidance</li>
                <li>Return to this page to see your personalized checklist</li>
                <li>Track progress by marking items as complete</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}