import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import styles from '@/lib/styles.module.css';
import { quickStartPlan, hasExistingPlan, getAllPlans } from '@/lib/planHelpers';
import { Layers, FastForward, History, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MakeAPlanLanding() {
  const [hasPlan, setHasPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingPlans = async () => {
      try {
        // Check if there are any existing plans
        const existingPlanIds = await getAllPlans();
        setHasPlan(existingPlanIds.length > 0);
      } catch (error) {
        console.error('Error checking for existing plans:', error);
        setHasPlan(false);
      }
    };
    
    checkExistingPlans();
  }, []);

  const handleFullConfiguration = () => {
    setLocation('/make-a-plan/full/intro');
  };

  const handleQuickStart = async () => {
    try {
      setIsLoading(true);
      // Create a new plan with default values
      const planId = await quickStartPlan();
      setLocation('/checklist');
    } catch (error) {
      console.error('Error creating quick start plan:', error);
      toast({
        title: "Error",
        description: "Failed to create a quick start plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      // Verify we have a valid plan before navigating
      const validPlan = await hasExistingPlan();
      
      if (validPlan) {
        setLocation('/checklist');
      } else {
        toast({
          title: "No saved plan found",
          description: "We couldn't find a saved plan to continue. Please start a new plan.",
          variant: "destructive"
        });
        setHasPlan(false);
      }
    } catch (error) {
      console.error('Error continuing saved plan:', error);
      toast({
        title: "Error",
        description: "Failed to load your saved plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminEditor = () => {
    setLocation('/make-a-plan/admin');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-tcof-blue mb-4">Make a Plan</h1>
          <p className="text-lg text-gray-700 mb-6">
            Pick the path that suits you. In every case we'll build one checklist you can export or update later.
          </p>
        </div>

        <div className={styles.cardGrid}>
          {/* Full Configuration Card */}
          <article className={styles.card} aria-labelledby="full-config-title">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4 text-tcof-teal">
                <Layers className="h-6 w-6 mr-2" aria-hidden="true" />
                <h2 id="full-config-title" className="text-xl font-semibold">Full Configuration</h2>
              </div>
              <p className="text-gray-700 mb-6 flex-grow">
                Step-by-step guidance through three building blocks.
              </p>
              <Button 
                onClick={handleFullConfiguration}
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                disabled={isLoading}
              >
                Start Full
              </Button>
            </div>
          </article>

          {/* Quick Start Card */}
          <article className={styles.card} aria-labelledby="quick-start-title">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4 text-tcof-teal">
                <FastForward className="h-6 w-6 mr-2" aria-hidden="true" />
                <h2 id="quick-start-title" className="text-xl font-semibold">Quick Start</h2>
              </div>
              <p className="text-gray-700 mb-6 flex-grow">
                Load the TCOF default set and jump straight to your checklist.
              </p>
              <p className="text-xs text-gray-500 mb-2">Preset heuristics: 2</p>
              <Button 
                onClick={handleQuickStart}
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Quick Start"}
              </Button>
            </div>
          </article>

          {/* Continue Saved Plan Card */}
          <article className={styles.card} aria-labelledby="continue-plan-title">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4 text-tcof-teal">
                <History className="h-6 w-6 mr-2" aria-hidden="true" />
                <h2 id="continue-plan-title" className="text-xl font-semibold">Continue Saved Plan</h2>
              </div>
              <p className="text-gray-700 mb-6 flex-grow">
                Pick up where you left off.
              </p>
              <Button 
                onClick={handleContinue}
                disabled={!hasPlan || isLoading}
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Loading..." : "Continue"}
              </Button>
            </div>
          </article>

          {/* Admin Preset Editor Card */}
          <article className={styles.card} aria-labelledby="admin-editor-title">
            <div className="flex flex-col h-full">
              <div className="flex items-center mb-4 text-tcof-teal">
                <Settings className="h-6 w-6 mr-2" aria-hidden="true" />
                <h2 id="admin-editor-title" className="text-xl font-semibold">Admin Preset Editor</h2>
              </div>
              <p className="text-gray-700 mb-6 flex-grow">
                Edit the default heuristics and tasks.
              </p>
              <Button 
                onClick={handleAdminEditor}
                className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                disabled={isLoading}
              >
                Open Editor
              </Button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}