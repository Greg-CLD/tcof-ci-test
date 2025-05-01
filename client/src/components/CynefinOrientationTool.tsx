import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  STORAGE_KEYS,
  CynefinQuadrant,
  CynefinSelection,
  initialCynefinSelection,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";

// Quadrant data structure
const quadrantData: Record<CynefinQuadrant, {
  title: string;
  description: string;
  approach: string;
  indicators: string[];
  recommendations: string[];
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = {
  clear: {
    title: "Clear",
    description: "Cause and effect relationships are obvious to all. Right answers exist and are easily identifiable.",
    approach: "Apply best practices",
    indicators: [
      "The solution is well-known and documented",
      "You've solved this exact problem before successfully",
      "There's industry consensus on how to approach this",
      "Standard operating procedures exist for this scenario"
    ],
    recommendations: [
      "Categorize: Define clear categories and best practices",
      "Delegate: Assign responsibilities based on expertise",
      "Implement: Follow established procedures and standards",
      "Measure: Set up clear KPIs to monitor performance"
    ],
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    textClass: "text-blue-700"
  },
  complicated: {
    title: "Complicated",
    description: "Cause and effect relationships exist but are not immediately apparent. Expert analysis is needed.",
    approach: "Sense, analyze, respond",
    indicators: [
      "The solution requires specialized knowledge or expertise",
      "Multiple viable solutions exist, requiring analysis to choose the best",
      "The challenge can be broken down into analyzable components",
      "Patterns from previous experiences can be applied with modifications"
    ],
    recommendations: [
      "Analyze: Conduct thorough analysis of the situation",
      "Consult: Engage subject matter experts for insights",
      "Plan: Create a detailed implementation strategy",
      "Test: Validate solutions before full deployment"
    ],
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    textClass: "text-green-700"
  },
  complex: {
    title: "Complex",
    description: "Cause and effect can only be perceived in retrospect. Patterns emerge but cannot be predicted in advance.",
    approach: "Probe, sense, respond",
    indicators: [
      "It's a novel challenge with no clear existing solution",
      "The environment is unpredictable and rapidly changing",
      "Multiple factors interact in unpredictable ways",
      "Each implementation will be unique due to context"
    ],
    recommendations: [
      "Probe: Design safe-to-fail experiments",
      "Sense: Observe patterns and emerging behaviors",
      "Respond: Amplify successful patterns, dampen unsuccessful ones",
      "Iterate: Continue experimentation and adaptation"
    ],
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    textClass: "text-red-700"
  },
  chaotic: {
    title: "Chaotic",
    description: "No clear cause and effect relationships. Crisis situation requiring immediate action before patterns can emerge.",
    approach: "Act, sense, respond",
    indicators: [
      "There's an immediate crisis requiring rapid response",
      "Normal operations have broken down",
      "There's high uncertainty and rapidly changing conditions",
      "Traditional approaches are ineffective in the current situation"
    ],
    recommendations: [
      "Act: Take immediate action to stabilize the situation",
      "Sense: Quickly gather information about what's happening",
      "Respond: Establish order and move toward stability",
      "Learn: After stabilization, reflect on crisis management"
    ],
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    textClass: "text-amber-700"
  }
};

export default function CynefinOrientationTool() {
  // Load existing selection from local storage
  const storedData = loadFromLocalStorage<CynefinSelection>(STORAGE_KEYS.CYNEFIN_SELECTION) || initialCynefinSelection;
  
  const [selectedQuadrant, setSelectedQuadrant] = useState<CynefinQuadrant | null>(storedData.quadrant);
  const [showIntro, setShowIntro] = useState(true);
  const { toast } = useToast();

  // Handle quadrant selection
  const handleQuadrantSelect = (quadrant: CynefinQuadrant) => {
    setSelectedQuadrant(prevQuadrant => prevQuadrant === quadrant ? null : quadrant);
  };

  // Reset selection
  const handleReset = () => {
    setSelectedQuadrant(null);
  };

  // Save selection
  const handleSave = () => {
    if (!selectedQuadrant) {
      toast({
        title: "Selection required",
        description: "Please select a domain type before saving.",
        variant: "destructive"
      });
      return;
    }

    const success = saveToLocalStorage(STORAGE_KEYS.CYNEFIN_SELECTION, {
      quadrant: selectedQuadrant,
      lastUpdated: Date.now()
    });
    
    if (success) {
      toast({
        title: "Selection saved",
        description: "Your domain type has been saved successfully."
      });
    } else {
      toast({
        title: "Error saving",
        description: "There was a problem saving your selection.",
        variant: "destructive"
      });
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🧭 Cynefin Orientation Tool</h2>
        <p className="text-gray-600">Do a situation assessment to find your bearings and choose the right approach.</p>
      </div>
      
      {showIntro && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Why do a situation assessment?</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowIntro(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-lg"></i>
              </Button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p>A situation assessment helps you find your bearings. It tells you what kind of challenge you're facing or likely to face, so you can choose the right delivery approach. Without this step, it's easy to rush in and head the wrong way.</p>
              
              <h4 className="font-bold mt-4 mb-2">How to use this tool:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Think about your idea, goal, or challenge</li>
                <li>Ask yourself: Do we know the answer, or do we need to figure it out?</li>
                <li>Use this tool to help you answer this question</li>
                <li>Record your Domain type (Clear, Complicated, Complex or Chaotic)</li>
              </ol>
              
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-blue-800 font-medium">In part C, you will get a checklist of tasks against the Success Factors and Goals for each stage in the Delivery Journey. There will be advice against each on how to adapt the task list for each stage.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <p className="mb-4">Select the domain that best describes your current situation:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(Object.keys(quadrantData) as CynefinQuadrant[]).map((quadrant) => {
              const data = quadrantData[quadrant];
              return (
                <div
                  key={quadrant}
                  className={`cynefin-quadrant ${data.bgClass} border-2 ${data.borderClass} rounded-lg p-4 md:p-5 ${
                    selectedQuadrant === quadrant ? 'selected' : ''
                  }`}
                  onClick={() => handleQuadrantSelect(quadrant)}
                >
                  <h3 className={`font-bold ${data.textClass} mb-2`}>{data.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{data.description}</p>
                  <div className={`text-xs ${data.textClass} font-medium`}>
                    Approach: {data.approach}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <h3 className="font-medium mb-2">Your Selection:</h3>
            <div id="cynefin-result" className={selectedQuadrant ? "text-gray-800" : "text-gray-500 italic"}>
              {selectedQuadrant 
                ? `You selected: ${quadrantData[selectedQuadrant].title}` 
                : "No domain selected yet. Click one of the options above."}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium transition flex items-center"
            >
              <i className="ri-refresh-line mr-1"></i> Reset Selection
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleSave}
              className="flex items-center gap-1"
            >
              <i className="ri-save-line mr-1"></i> Save Result
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {selectedQuadrant && (
        <Card className="mt-6">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-bold text-lg mb-4">Domain Guide: {quadrantData[selectedQuadrant].title}</h3>
            
            <Accordion type="single" collapsible defaultValue="indicators">
              <AccordionItem value="indicators">
                <AccordionTrigger className="font-medium">How to recognize this domain</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc pl-5">
                    {quadrantData[selectedQuadrant].indicators.map((indicator, index) => (
                      <li key={index}>{indicator}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="recommendations">
                <AccordionTrigger className="font-medium">Recommended actions</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {quadrantData[selectedQuadrant].recommendations.map((rec, index) => {
                      const [action, description] = rec.split(": ");
                      return (
                        <li key={index}>
                          <span className="font-medium">{action}:</span> {description}
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="nextSteps">
                <AccordionTrigger className="font-medium">Next steps</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p>Now that you've identified your domain as <strong className={quadrantData[selectedQuadrant].textClass}>{quadrantData[selectedQuadrant].title}</strong>, you can:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Record this selection for reference in your delivery journey</li>
                      <li>Share this understanding with your team to align everyone's expectations</li>
                      <li>Adapt your strategy based on the recommendations provided</li>
                      <li>Move to the TCOF Journey Tool to continue planning your approach</li>
                    </ol>
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-blue-800">Congratulations, you know your domain! This insight will help you navigate your delivery journey more effectively.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
