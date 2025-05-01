import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  STORAGE_KEYS,
  TCOFJourneyData,
  ImplementationStage,
  initialTCOFJourneyData,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";

// Decision tree question type
type Question = {
  id: string;
  text: string;
  yesLeadsTo: string | ImplementationStage;
  noLeadsTo: string | ImplementationStage;
};

// Decision tree data structure
const decisionTree: Record<string, Question> = {
  "q1": {
    id: "q1",
    text: "Do you already know what outcome or problem you're trying to solve?",
    yesLeadsTo: "q2",
    noLeadsTo: "identification"
  },
  "q2": {
    id: "q2",
    text: "Are you still exploring different ideas or approaches?",
    yesLeadsTo: "identification",
    noLeadsTo: "q3"
  },
  "q3": {
    id: "q3",
    text: "Have you picked the option you're going to move forward with?",
    yesLeadsTo: "q4",
    noLeadsTo: "definition"
  },
  "q4": {
    id: "q4",
    text: "Have you tested your idea in a small way, and do you have a delivery plan (with funding) ready?",
    yesLeadsTo: "q5",
    noLeadsTo: "definition"
  },
  "q5": {
    id: "q5",
    text: "Has your product or solution already been delivered and adopted by users?",
    yesLeadsTo: "closure",
    noLeadsTo: "delivery"
  }
};

// Question numbers and total questions for display
const questionNumbers: Record<string, number> = {
  "q1": 1,
  "q2": 2,
  "q3": 3,
  "q4": 4,
  "q5": 5
};
const totalQuestions = Object.keys(questionNumbers).length;

// Phase descriptions
const phaseDescriptions: Record<ImplementationStage, {
  title: string;
  description: string;
  keyActivities: string[];
  bgClass: string;
  borderClass: string;
}> = {
  "identification": {
    title: "Phase 1: Identification",
    description: "In this early phase, you're exploring and identifying the problem space, potential solutions, and setting initial goals.",
    keyActivities: [
      "Define the problem or opportunity clearly",
      "Conduct research to understand the landscape",
      "Explore different potential solutions",
      "Gather initial requirements and constraints"
    ],
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200"
  },
  "definition": {
    title: "Phase 2: Definition",
    description: "You've selected an approach and are now defining the details of your solution, planning the implementation.",
    keyActivities: [
      "Detail the chosen solution approach",
      "Create implementation plans and timelines",
      "Secure necessary resources and funding",
      "Define success metrics and evaluation criteria"
    ],
    bgClass: "bg-green-50",
    borderClass: "border-green-200"
  },
  "delivery": {
    title: "Phase 3: Delivery",
    description: "You're actively implementing and testing your solution, making adjustments as needed based on feedback.",
    keyActivities: [
      "Execute the implementation plan",
      "Track progress against key milestones",
      "Manage scope, budget, and timeline",
      "Collect feedback and make necessary adjustments"
    ],
    bgClass: "bg-purple-50",
    borderClass: "border-purple-200"
  },
  "closure": {
    title: "Phase 4: Closure",
    description: "Your solution has been delivered and adopted. You're now evaluating results and capturing lessons learned.",
    keyActivities: [
      "Evaluate success against defined metrics",
      "Document lessons learned and best practices",
      "Transition to ongoing operations or maintenance",
      "Plan for future enhancements or related initiatives"
    ],
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200"
  }
};

export default function TCOFJourneyTool() {
  // Load existing data from local storage
  const storedData = loadFromLocalStorage<TCOFJourneyData>(STORAGE_KEYS.TCOF_JOURNEY) || initialTCOFJourneyData;

  // Decision tree states
  const [currentQuestion, setCurrentQuestion] = useState<string>("q1");
  const [determined, setDetermined] = useState<boolean>(!!storedData.stage);
  const [stage, setStage] = useState<ImplementationStage | null>(storedData.stage);
  const [notes, setNotes] = useState<Record<string, string>>(storedData.notes || {});
  const [showIntro, setShowIntro] = useState<boolean>(true);
  
  const { toast } = useToast();

  // Handle answering a question
  const handleAnswer = (questionId: string, answer: boolean) => {
    const question = decisionTree[questionId];
    const nextStep = answer ? question.yesLeadsTo : question.noLeadsTo;
    
    // Check if we've reached a conclusion (stage) or another question
    if (typeof nextStep === "string" && Object.keys(decisionTree).includes(nextStep)) {
      // Move to next question
      setCurrentQuestion(nextStep);
    } else {
      // Set the determined stage
      setStage(nextStep as ImplementationStage);
      setDetermined(true);
    }
  };

  // Handle note input for questions
  const handleNoteChange = (questionId: string, noteText: string) => {
    setNotes(prev => ({
      ...prev,
      [questionId]: noteText
    }));
  };

  // Go back to questions
  const handleReset = () => {
    setCurrentQuestion("q1");
    setDetermined(false);
    setStage(null);
  };

  // Save journey data
  const handleSave = () => {
    if (!stage) {
      toast({
        title: "No phase determined",
        description: "Please complete the decision tree to determine your phase.",
        variant: "destructive"
      });
      return;
    }

    const journeyData: TCOFJourneyData = {
      ...storedData,
      stage,
      notes,
      lastUpdated: Date.now()
    };
    
    const success = saveToLocalStorage(STORAGE_KEYS.TCOF_JOURNEY, journeyData);
    
    if (success) {
      toast({
        title: "Journey data saved",
        description: "Your delivery phase and notes have been saved successfully."
      });
    } else {
      toast({
        title: "Error saving",
        description: "There was a problem saving your journey data.",
        variant: "destructive"
      });
    }
  };

  // Export decision tree answers and results
  const handleExport = () => {
    try {
      // Create text content
      let content = `TCOF Journey - Delivery Phase Assessment\n`;
      content += `========================================\n\n`;
      
      // Add timestamp
      content += `Date: ${new Date().toLocaleDateString()}\n\n`;
      
      // Add questions and answers
      content += `Decision Tree Responses:\n`;
      Object.keys(decisionTree).forEach(qId => {
        const q = decisionTree[qId];
        content += `\nQ: ${q.text}\n`;
        if (notes[qId]) {
          content += `Notes: ${notes[qId]}\n`;
        }
      });
      
      content += `\n----------------------------------------\n\n`;
      content += `Determined Phase: ${stage ? phaseDescriptions[stage].title : 'Not yet determined'}\n\n`;
      
      if (stage) {
        content += `Description: ${phaseDescriptions[stage].description}\n\n`;
        content += `Key Activities for this Phase:\n`;
        phaseDescriptions[stage].keyActivities.forEach((activity, index) => {
          content += `${index + 1}. ${activity}\n`;
        });
      }
      
      // Create a downloadable text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `tcof-journey-phase-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      
      toast({
        title: "Results exported",
        description: "Your journey phase assessment has been exported as a text file."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your results.",
        variant: "destructive"
      });
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🧪 TCOF Journey Decision Tree</h2>
        <p className="text-gray-600">Figure out where you are in the delivery journey.</p>
      </div>
      
      {showIntro && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Why determine your position?</h3>
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
              <p>Knowing your stage helps you focus. It shows you where to start with the Connected Outcomes Framework.</p>
              
              <h4 className="font-bold mt-4 mb-2">How to use this tool:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Answer the questions about your current situation</li>
                <li>Add notes to record your thoughts for each question</li>
                <li>The tool will determine which phase of the delivery journey you're in</li>
                <li>Save your results for future reference</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-4 md:p-6">
          {!determined ? (
            <div className="decision-tree">
              <h3 className="font-bold text-lg mb-4">Step 3: Plot Your Position</h3>
              
              <div className="current-question p-4 border border-gray-200 rounded-lg mb-6">
                <div className="flex items-center mb-3">
                  <span className="bg-gray-700 text-white text-xs font-medium px-2 py-1 rounded-full mr-2">
                    Q{questionNumbers[currentQuestion]} of {totalQuestions}
                  </span>
                  <h4 className="font-medium text-lg">{decisionTree[currentQuestion].text}</h4>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor={`notes-${currentQuestion}`} className="block text-sm font-medium mb-2">
                    Your Notes (Optional)
                  </Label>
                  <Textarea
                    id={`notes-${currentQuestion}`}
                    value={notes[currentQuestion] || ""}
                    onChange={(e) => handleNoteChange(currentQuestion, e.target.value)}
                    placeholder="Add your thoughts or context here..."
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => handleAnswer(currentQuestion, true)}
                    variant="secondary"
                    className="min-w-[100px]"
                  >
                    Yes
                  </Button>
                  <Button 
                    onClick={() => handleAnswer(currentQuestion, false)}
                    variant="outline"
                    className="min-w-[100px]"
                  >
                    No
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 italic text-center">
                Answer the questions to determine your current stage in the delivery journey.
              </div>
            </div>
          ) : (
            <div className="result">
              {stage && (
                <div className={`p-5 ${phaseDescriptions[stage].bgClass} ${phaseDescriptions[stage].borderClass} border rounded-lg mb-6`}>
                  <h3 className="font-bold text-lg mb-2">{phaseDescriptions[stage].title}</h3>
                  <p className="mb-4">{phaseDescriptions[stage].description}</p>
                  
                  <h4 className="font-medium mb-2">Key Activities:</h4>
                  <ul className="list-disc pl-5 space-y-1 mb-4">
                    {phaseDescriptions[stage].keyActivities.map((activity, index) => (
                      <li key={index}>{activity}</li>
                    ))}
                  </ul>
                  
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <p className="font-medium text-gray-800">You're here based on your answers to the decision tree.</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={handleReset}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium transition flex items-center"
                >
                  <i className="ri-refresh-line mr-1"></i> Start Over
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    className="flex items-center gap-1"
                  >
                    <i className="ri-download-line mr-1"></i> Export Results
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleSave}
                    className="flex items-center gap-1"
                  >
                    <i className="ri-save-line mr-1"></i> Save Results
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}