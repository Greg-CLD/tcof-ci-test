import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useProjectContext } from "@/contexts/ProjectContext";
import {
  STORAGE_KEYS,
  CynefinQuadrant,
  CynefinSelection,
  initialCynefinSelection,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";
import { elementToPDF } from "@/lib/pdf-utils";
import { FileDown, Save, Loader2 } from "lucide-react";

// API response type for Cynefin selections
interface CynefinSelectionResponse {
  id: string;
  name: string;
  data: CynefinSelection;
  userId: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

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

interface CynefinOrientationToolProps {
  projectId?: string | null;
}

export default function CynefinOrientationTool({ projectId: propProjectId }: CynefinOrientationToolProps) {
  // Get the current project from context or props
  const { currentProject } = useProjectContext();
  const projectId = propProjectId || currentProject?.id;
  
  // Log for debugging
  useEffect(() => {
    console.log(`CynefinOrientationTool: Using projectId: ${projectId} (from props: ${propProjectId}, from context: ${currentProject?.id})`);
  }, [projectId, propProjectId, currentProject?.id]);
  
  // State to track if we've loaded data from server
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for persisting between sessions
  const [selectedQuadrant, setSelectedQuadrant] = useState<CynefinQuadrant | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [selectionName, setSelectionName] = useState("My Cynefin Assessment");
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch Cynefin selection data from server for the current project
  const {
    data: serverSelection,
    isLoading: selectionLoading,
    error: selectionError
  } = useQuery<CynefinSelectionResponse | null>({
    queryKey: ['/api/cynefin-selections', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project selected");
      const res = await apiRequest("GET", `/api/cynefin-selections?projectId=${projectId}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null; // No Cynefin selection found for this project
        }
        throw new Error("Failed to fetch Cynefin selection");
      }
      return await res.json();
    },
    enabled: !!projectId,
  });
  
  // Load existing selection from local storage on component mount
  useEffect(() => {
    async function loadSavedData() {
      try {
        const storedData = await loadFromLocalStorage<CynefinSelection>(STORAGE_KEYS.CYNEFIN_SELECTION);
        if (storedData && storedData.quadrant) {
          console.log("Loading Cynefin selection from local storage:", storedData);
          setSelectedQuadrant(storedData.quadrant);
        }
      } catch (error) {
        console.error("Error loading Cynefin selection from local storage:", error);
      }
    }
    
    if (!hasLoadedData && !serverSelection) {
      loadSavedData();
    }
  }, [hasLoadedData, serverSelection]);
  
  // Interface for the mutation data
  interface SaveSelectionData {
    name: string;
    data: CynefinSelection;
    projectId: string;
  }
  
  // Database save mutation
  const saveSelectionMutation = useMutation({
    mutationFn: async (data: SaveSelectionData) => {
      const response = await apiRequest("POST", "/api/cynefin-selections", data);
      if (!response.ok) {
        throw new Error("Failed to save selection to database");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the cynefin selections query
      queryClient.invalidateQueries({ queryKey: ["/api/cynefin-selections", projectId] });
      
      // Invalidate the project-progress query to update tool completion status
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
      
      console.log(`Invalidated cynefin selections and progress for project: ${projectId}`);
      
      toast({
        title: "Assessment saved",
        description: "Your Cynefin assessment has been saved to your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load data from server when available
  useEffect(() => {
    if (serverSelection && !hasLoadedData) {
      console.log("Loading Cynefin selection data from server:", serverSelection);
      
      // Set selection name
      if (serverSelection.name) {
        setSelectionName(serverSelection.name);
      }
      
      // Set selected quadrant if available
      if (serverSelection.data?.quadrant) {
        setSelectedQuadrant(serverSelection.data.quadrant);
      }
      
      setHasLoadedData(true);
    }
  }, [serverSelection, hasLoadedData]);

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

    if (!projectId) {
      toast({
        title: "No project selected",
        description: "Please select a project before saving.",
        variant: "destructive"
      });
      return;
    }

    // First save to localStorage for offline use
    const data = {
      quadrant: selectedQuadrant,
      lastUpdated: Date.now()
    };
    
    const success = saveToLocalStorage(STORAGE_KEYS.CYNEFIN_SELECTION, data);
    
    if (!success) {
      toast({
        title: "Error saving locally",
        description: "There was a problem saving your selection to local storage.",
        variant: "destructive"
      });
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    
    // Then save to database if user is logged in
    if (user) {
      saveSelectionMutation.mutate({
        name: selectionName,
        data: data,
        projectId: projectId
      }, {
        onSettled: () => {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
      toast({
        title: "Assessment saved locally",
        description: "Your assessment has been saved locally. Sign in to save it to your account.",
      });
    }
  };

  // Add reference for PDF export
  const toolRef = useRef<HTMLDivElement>(null);
  
  // Handle PDF export
  const handleExportPDF = () => {
    if (toolRef.current) {
      elementToPDF(toolRef.current, 'cynefin-orientation-tool.pdf');
      toast({
        title: "PDF generated",
        description: "Your Cynefin assessment has been exported as PDF."
      });
    }
  };

  return (
    <section ref={toolRef}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🧭 Cynefin Orientation Tool</h2>
        <p className="text-gray-600">Do a situation assessment to find your bearings and choose the right approach.</p>
      </div>
      
      {selectionLoading && !hasLoadedData && (
        <Card className="mb-6">
          <CardContent className="p-6 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-tcof-teal mr-2" />
            <p>Loading your saved assessment...</p>
          </CardContent>
        </Card>
      )}
      
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
          
          {selectedQuadrant && (
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="w-full md:w-1/3">
                <label htmlFor="selection-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Assessment Name
                </label>
                <Input
                  id="selection-name"
                  value={selectionName}
                  onChange={(e) => setSelectionName(e.target.value)}
                  placeholder="Enter a name for your assessment"
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium transition flex items-center"
            >
              <i className="ri-refresh-line mr-1"></i> Reset Selection
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save Result
                  </>
                )}
              </Button>
              {selectedQuadrant && (
                <Button 
                  onClick={handleExportPDF} 
                  variant="outline" 
                  className="flex items-center gap-1 bg-tcof-light text-tcof-dark border-tcof-teal"
                >
                  <FileDown className="h-4 w-4" /> Download as PDF
                </Button>
              )}
            </div>
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
