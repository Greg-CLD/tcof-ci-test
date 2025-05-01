import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  recommendations: string[];
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = {
  clear: {
    title: "Clear",
    description: "Cause and effect relationships are obvious to all. Right answers exist and are easily identifiable.",
    approach: "Apply best practices",
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
    description: "Cause and effect can only be perceived in retrospect. Patterns emerge but cannot be predicted.",
    approach: "Probe, sense, respond",
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
    description: "No clear cause and effect relationships. Crisis situation requiring immediate action.",
    approach: "Act, sense, respond",
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
        description: "Please select a quadrant before saving.",
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
        description: "Your Cynefin selection has been saved successfully."
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
        <p className="text-gray-600">Identify your scenario type to determine the best approach.</p>
      </div>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <p className="mb-4">Select the quadrant that best describes your current situation:</p>
          
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
                : "No quadrant selected yet. Click one of the options above."}
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
      
      <Card className="mt-6">
        <CardContent className="p-4 md:p-6">
          <h3 className="font-bold mb-3">Recommended Actions</h3>
          <div 
            className={`p-4 bg-gray-50 rounded-lg ${
              selectedQuadrant ? "text-gray-800" : "text-gray-500 italic"
            }`}
          >
            {selectedQuadrant ? (
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
            ) : (
              "Select a quadrant to see recommended actions."
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
