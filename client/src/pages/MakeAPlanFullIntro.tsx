import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CircleCheck, ArrowRight, Blocks, Search, Lightbulb, Target } from 'lucide-react';

export default function MakeAPlanFullIntro() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-tcof-dark mb-2">Full Configuration Plan</h1>
        <p className="text-center text-gray-600 mb-10">Complete all three blocks to create your comprehensive plan</p>
        
        <div className="grid gap-8 mb-8">
          <Card className="border-tcof-teal/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-tcof-dark">How It Works</CardTitle>
              <CardDescription>
                The Full Configuration journey consists of three distinct blocks, each focused on a key aspect of your delivery approach.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6">
                This step-by-step process will guide you through assessing your context, defining your success factors, 
                and determining the most effective delivery approach for your specific situation.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-tcof-light/30">
                  <div className="mt-0.5">
                    <div className="flex items-center justify-center w-8 h-8 bg-tcof-teal rounded-full text-white font-bold">
                      1
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-tcof-dark mb-1">Block 1: Discover</h3>
                    <p className="text-gray-600">
                      Rate the 12 success factors based on their importance to your context and add your own personal heuristics to guide decision-making.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-tcof-light/30">
                  <div className="mt-0.5">
                    <div className="flex items-center justify-center w-8 h-8 bg-tcof-teal rounded-full text-white font-bold">
                      2
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-tcof-dark mb-1">Block 2: Design</h3>
                    <p className="text-gray-600">
                      Import external data (such as Excel spreadsheets) and connect insights to make informed decisions about your approach.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-tcof-light/30">
                  <div className="mt-0.5">
                    <div className="flex items-center justify-center w-8 h-8 bg-tcof-teal rounded-full text-white font-bold">
                      3
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-tcof-dark mb-1">Block 3: Deliver</h3>
                    <p className="text-gray-600">
                      Define your delivery approach by assessing scope and uncertainty, then select appropriate methods and tools.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pt-4">
              <Link href="/make-a-plan/full/block-1">
                <Button className="bg-tcof-teal hover:bg-tcof-teal/90 text-white px-8 py-6 text-lg flex items-center gap-2">
                  Start Block 1 <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
        
        <div className="grid gap-6 mt-10 md:grid-cols-3">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-tcof-light flex items-center justify-center mb-4">
              <Target className="h-7 w-7 text-tcof-teal" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Focused Planning</h3>
            <p className="text-gray-600 text-sm">
              Break down complex planning into manageable blocks that build upon each other
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-tcof-light flex items-center justify-center mb-4">
              <Lightbulb className="h-7 w-7 text-tcof-teal" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Informed Decisions</h3>
            <p className="text-gray-600 text-sm">
              Connect insights across tools to make data-driven choices for your delivery approach
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-tcof-light flex items-center justify-center mb-4">
              <Blocks className="h-7 w-7 text-tcof-teal" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Complete Framework</h3>
            <p className="text-gray-600 text-sm">
              Develop a holistic plan that addresses all aspects of successful delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}