import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  STORAGE_KEYS,
  TCOFJourneyData,
  ImplementationStage,
  ResourceLevel,
  Priority,
  Timeframe,
  EvaluationFrequency,
  initialTCOFJourneyData,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";

export default function TCOFJourneyTool() {
  // Load existing data from local storage
  const storedData = loadFromLocalStorage<TCOFJourneyData>(STORAGE_KEYS.TCOF_JOURNEY) || initialTCOFJourneyData;
  
  // Setup state for each step with initial values from storage
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stage, setStage] = useState<ImplementationStage | null>(storedData.stage);
  const [technicalExpertise, setTechnicalExpertise] = useState<number>(storedData.capabilities.technicalExpertise);
  const [resources, setResources] = useState<ResourceLevel | null>(storedData.capabilities.resources);
  const [priority, setPriority] = useState<Priority | null>(storedData.priority);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(storedData.implementation.timeframe);
  const [constraints, setConstraints] = useState<string[]>(storedData.implementation.constraints);
  const [metrics, setMetrics] = useState<string[]>(storedData.metrics.primary);
  const [newMetric, setNewMetric] = useState<string>("");
  const [evaluationFrequency, setEvaluationFrequency] = useState<EvaluationFrequency | null>(
    storedData.metrics.evaluationFrequency
  );
  const [showResults, setShowResults] = useState<boolean>(false);
  
  const { toast } = useToast();
  const totalSteps = 5;

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Handle navigation between steps
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save data and show results
      handleSaveData();
      setShowResults(true);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle adding a new metric
  const handleAddMetric = () => {
    if (newMetric.trim() !== "") {
      setMetrics([...metrics, newMetric.trim()]);
      setNewMetric("");
    }
  };

  // Handle removing a metric
  const handleRemoveMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  // Handle constraint toggles
  const handleConstraintToggle = (value: string) => {
    setConstraints(prev => 
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  // Save all journey data
  const handleSaveData = () => {
    const journeyData: TCOFJourneyData = {
      stage,
      capabilities: {
        technicalExpertise,
        resources
      },
      priority,
      implementation: {
        timeframe,
        constraints
      },
      metrics: {
        primary: metrics,
        evaluationFrequency
      },
      lastUpdated: Date.now()
    };
    
    const success = saveToLocalStorage(STORAGE_KEYS.TCOF_JOURNEY, journeyData);
    
    if (success) {
      toast({
        title: "Journey data saved",
        description: "Your TCOF journey information has been saved successfully."
      });
    } else {
      toast({
        title: "Error saving",
        description: "There was a problem saving your journey data.",
        variant: "destructive"
      });
    }
  };

  // Handle export of recommendations
  const handleExportRecommendations = () => {
    try {
      // Create text content
      let content = `TCOF Journey Recommendations\n`;
      content += `=============================\n\n`;
      content += `Implementation Stage: ${stage ? formatStage(stage) : 'Not specified'}\n`;
      content += `Technical Expertise Level: ${technicalExpertise}/5\n`;
      content += `Available Resources: ${resources ? formatResource(resources) : 'Not specified'}\n`;
      content += `Primary Driver: ${priority ? formatPriority(priority) : 'Not specified'}\n\n`;
      
      content += `Timeframe: ${timeframe ? formatTimeframe(timeframe) : 'Not specified'}\n`;
      content += `Constraints: ${constraints.length > 0 ? constraints.join(', ') : 'None specified'}\n\n`;
      
      content += `Primary Metrics: ${metrics.length > 0 ? metrics.join(', ') : 'None specified'}\n`;
      content += `Evaluation Frequency: ${evaluationFrequency ? formatFrequency(evaluationFrequency) : 'Not specified'}\n\n`;
      
      content += `Recommended Next Steps:\n`;
      content += `- ${getRecommendation()}\n`;
      
      // Create a downloadable text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `tcof-recommendations-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      
      toast({
        title: "Recommendations exported",
        description: "Your TCOF recommendations have been exported as a text file."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your recommendations.",
        variant: "destructive"
      });
    }
  };

  // Helper function to get a sample recommendation based on the selected stage
  const getRecommendation = () => {
    if (!stage) return "Complete all steps to receive personalized recommendations.";
    
    switch (stage) {
      case "exploration":
        return "Research different approaches and methodologies that align with your resources and capabilities.";
      case "planning":
        return "Develop a detailed implementation roadmap with key milestones and stakeholder communication plan.";
      case "execution":
        return "Establish regular check-ins and progress tracking to ensure alignment with strategic goals.";
      case "evaluation":
        return "Create a comprehensive feedback loop to capture learnings and adjust future implementations.";
      default:
        return "Complete all steps to receive personalized recommendations.";
    }
  };

  // Format helper functions
  const formatStage = (s: ImplementationStage): string => {
    const formats: Record<ImplementationStage, string> = {
      exploration: "Exploration",
      planning: "Planning",
      execution: "Execution",
      evaluation: "Evaluation"
    };
    return formats[s];
  };

  const formatResource = (r: ResourceLevel): string => {
    const formats: Record<ResourceLevel, string> = {
      minimal: "Minimal (Limited budget/staff)",
      adequate: "Adequate (Standard resources)",
      abundant: "Abundant (Well-resourced)"
    };
    return formats[r];
  };

  const formatPriority = (p: Priority): string => {
    const formats: Record<Priority, string> = {
      efficiency: "Operational Efficiency",
      innovation: "Innovation",
      experience: "Customer Experience",
      cost: "Cost Reduction"
    };
    return formats[p];
  };

  const formatTimeframe = (t: Timeframe): string => {
    const formats: Record<Timeframe, string> = {
      immediate: "Immediate (< 3 months)",
      short: "Short-term (3-6 months)",
      medium: "Medium-term (6-12 months)",
      long: "Long-term (> 12 months)"
    };
    return formats[t];
  };

  const formatFrequency = (f: EvaluationFrequency): string => {
    const formats: Record<EvaluationFrequency, string> = {
      weekly: "Weekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annually: "Annually"
    };
    return formats[f];
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🧪 TCOF Journey Decision Tree</h2>
        <p className="text-gray-600">Identify your current journey stage and get tailored recommendations.</p>
      </div>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center mb-6">
            <Progress value={progressPercentage} className="h-2" />
            <span className="ml-3 text-sm font-medium">
              Step {currentStep}/{totalSteps}
            </span>
          </div>
          
          {/* Step 1: Implementation Stage */}
          {currentStep === 1 && (
            <div className="tree-node">
              <h3 className="font-bold text-lg mb-3">1. Current Implementation Stage</h3>
              <p className="mb-4 text-gray-600">Where are you in your implementation journey?</p>
              
              <RadioGroup
                value={stage || ""}
                onValueChange={(value) => setStage(value as ImplementationStage)}
                className="space-y-3 mb-6"
              >
                <div className="flex items-start">
                  <RadioGroupItem value="exploration" id="stage-exploration" className="mt-1 mr-3" />
                  <Label htmlFor="stage-exploration" className="cursor-pointer">
                    <div className="font-medium">Exploration</div>
                    <div className="text-sm text-gray-600">Researching options and possibilities</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="planning" id="stage-planning" className="mt-1 mr-3" />
                  <Label htmlFor="stage-planning" className="cursor-pointer">
                    <div className="font-medium">Planning</div>
                    <div className="text-sm text-gray-600">Developing strategy and roadmap</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="execution" id="stage-execution" className="mt-1 mr-3" />
                  <Label htmlFor="stage-execution" className="cursor-pointer">
                    <div className="font-medium">Execution</div>
                    <div className="text-sm text-gray-600">Actively implementing initiatives</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="evaluation" id="stage-evaluation" className="mt-1 mr-3" />
                  <Label htmlFor="stage-evaluation" className="cursor-pointer">
                    <div className="font-medium">Evaluation</div>
                    <div className="text-sm text-gray-600">Assessing outcomes and results</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Step 2: Team Capabilities */}
          {currentStep === 2 && (
            <div className="tree-node">
              <h3 className="font-bold text-lg mb-3">2. Team Capabilities</h3>
              <p className="mb-4 text-gray-600">Rate your team's current capabilities in implementing this approach:</p>
              
              <div className="mb-4">
                <Label htmlFor="capability-slider" className="block text-sm font-medium mb-2">
                  Technical Expertise
                </Label>
                <Slider
                  id="capability-slider"
                  min={1}
                  max={5}
                  step={1}
                  value={[technicalExpertise]}
                  onValueChange={(value) => setTechnicalExpertise(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 px-1 mt-1">
                  <span>Novice</span>
                  <span>Expert</span>
                </div>
              </div>
              
              <div className="mb-6">
                <Label htmlFor="resources" className="block text-sm font-medium mb-2">
                  Available Resources
                </Label>
                <Select value={resources || ""} onValueChange={(value) => setResources(value as ResourceLevel)}>
                  <SelectTrigger id="resources">
                    <SelectValue placeholder="Select resource level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (Limited budget/staff)</SelectItem>
                    <SelectItem value="adequate">Adequate (Standard resources)</SelectItem>
                    <SelectItem value="abundant">Abundant (Well-resourced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Step 3: Organizational Priorities */}
          {currentStep === 3 && (
            <div className="tree-node">
              <h3 className="font-bold text-lg mb-3">3. Organizational Priorities</h3>
              <p className="mb-4 text-gray-600">What is the primary driver for this initiative?</p>
              
              <RadioGroup
                value={priority || ""}
                onValueChange={(value) => setPriority(value as Priority)}
                className="space-y-3 mb-6"
              >
                <div className="flex items-start">
                  <RadioGroupItem value="efficiency" id="priority-efficiency" className="mt-1 mr-3" />
                  <Label htmlFor="priority-efficiency" className="cursor-pointer">
                    <div className="font-medium">Operational Efficiency</div>
                    <div className="text-sm text-gray-600">Improving internal processes and productivity</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="innovation" id="priority-innovation" className="mt-1 mr-3" />
                  <Label htmlFor="priority-innovation" className="cursor-pointer">
                    <div className="font-medium">Innovation</div>
                    <div className="text-sm text-gray-600">Creating new products or services</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="experience" id="priority-experience" className="mt-1 mr-3" />
                  <Label htmlFor="priority-experience" className="cursor-pointer">
                    <div className="font-medium">Customer Experience</div>
                    <div className="text-sm text-gray-600">Enhancing customer satisfaction and engagement</div>
                  </Label>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="cost" id="priority-cost" className="mt-1 mr-3" />
                  <Label htmlFor="priority-cost" className="cursor-pointer">
                    <div className="font-medium">Cost Reduction</div>
                    <div className="text-sm text-gray-600">Decreasing expenses and optimizing resources</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Step 4: Implementation Timeframe */}
          {currentStep === 4 && (
            <div className="tree-node">
              <h3 className="font-bold text-lg mb-3">4. Implementation Timeframe</h3>
              <p className="mb-4 text-gray-600">What is your expected implementation timeline?</p>
              
              <div className="mb-6">
                <Select value={timeframe || ""} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate ({"<"} 3 months)</SelectItem>
                    <SelectItem value="short">Short-term (3-6 months)</SelectItem>
                    <SelectItem value="medium">Medium-term (6-12 months)</SelectItem>
                    <SelectItem value="long">Long-term ({">"}12 months)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-6">
                <Label className="block text-sm font-medium mb-2">
                  Major Constraints (Select all that apply)
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox 
                      id="constraint-budget" 
                      checked={constraints.includes("Budget limitations")}
                      onCheckedChange={() => handleConstraintToggle("Budget limitations")}
                      className="mr-2" 
                    />
                    <Label htmlFor="constraint-budget">Budget limitations</Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox 
                      id="constraint-expertise" 
                      checked={constraints.includes("Technical expertise")}
                      onCheckedChange={() => handleConstraintToggle("Technical expertise")}
                      className="mr-2" 
                    />
                    <Label htmlFor="constraint-expertise">Technical expertise</Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox 
                      id="constraint-stakeholders" 
                      checked={constraints.includes("Stakeholder alignment")}
                      onCheckedChange={() => handleConstraintToggle("Stakeholder alignment")}
                      className="mr-2" 
                    />
                    <Label htmlFor="constraint-stakeholders">Stakeholder alignment</Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox 
                      id="constraint-integration" 
                      checked={constraints.includes("Integration with existing systems")}
                      onCheckedChange={() => handleConstraintToggle("Integration with existing systems")}
                      className="mr-2" 
                    />
                    <Label htmlFor="constraint-integration">Integration with existing systems</Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Success Metrics */}
          {currentStep === 5 && (
            <div className="tree-node">
              <h3 className="font-bold text-lg mb-3">5. Success Metrics</h3>
              <p className="mb-4 text-gray-600">How will you measure success?</p>
              
              <div className="mb-6">
                <Label className="block text-sm font-medium mb-2">
                  Primary Success Metrics
                </Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {metrics.map((metric, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm inline-flex items-center">
                      {metric}
                      <button 
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveMetric(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMetric}
                      onChange={(e) => setNewMetric(e.target.value)}
                      className="border border-gray-300 rounded-l-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Add metric..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMetric();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddMetric}
                      className="border border-dashed border-gray-300 px-3 py-1 rounded-r-full text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="evaluation-frequency" className="block text-sm font-medium mb-2">
                    Evaluation Frequency
                  </Label>
                  <Select 
                    value={evaluationFrequency || ""} 
                    onValueChange={(value) => setEvaluationFrequency(value as EvaluationFrequency)}
                  >
                    <SelectTrigger id="evaluation-frequency">
                      <SelectValue placeholder="Select frequency..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Results */}
          {showResults && (
            <div className="tree-node">
              <div className="p-6 bg-primary bg-opacity-10 rounded-lg border border-primary border-opacity-20">
                <h3 className="font-bold text-lg text-primary mb-2">Your TCOF Journey Recommendations</h3>
                <div className="mb-4">
                  <p className="text-gray-700">
                    Based on your responses, you're at the{' '}
                    <span className="font-medium">{stage ? formatStage(stage) : 'Unspecified'}</span> stage
                    {priority && (
                      <> focused on <span className="font-medium">{formatPriority(priority)}</span></>
                    )}.
                  </p>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Recommended Next Steps:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>{getRecommendation()}</li>
                    {resources === 'minimal' && (
                      <li>Consider prioritizing initiatives based on resource constraints and high-impact opportunities.</li>
                    )}
                    {technicalExpertise < 3 && (
                      <li>Allocate time for team training and seek external expertise where necessary.</li>
                    )}
                    {constraints.includes("Stakeholder alignment") && (
                      <li>Develop a stakeholder communication plan to ensure alignment and buy-in.</li>
                    )}
                    {metrics.length > 0 && (
                      <li>Establish baseline metrics for: {metrics.join(', ')}.</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Suggested Resources:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>TCOF Planning Template</li>
                    <li>Stakeholder Management Guide</li>
                    <li>{priority === 'efficiency' ? 'Efficiency Metrics Framework' : 
                         priority === 'innovation' ? 'Innovation Assessment Toolkit' :
                         priority === 'experience' ? 'Customer Experience Measurement Guide' :
                         priority === 'cost' ? 'Cost Reduction Strategy Playbook' : 
                         'Strategic Planning Resources'}</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button onClick={handleExportRecommendations} variant="secondary" className="flex items-center gap-1 mx-auto">
                  <i className="ri-download-line mr-1"></i> Export Recommendations
                </Button>
              </div>
            </div>
          )}
          
          {/* Navigation buttons */}
          {!showResults && (
            <div className="flex justify-between mt-6">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={goToPrevStep}
                  className="flex items-center gap-1"
                >
                  <i className="ri-arrow-left-line"></i> Previous
                </Button>
              )}
              {currentStep === 1 && <div></div>}
              <Button
                onClick={goToNextStep}
                className="flex items-center gap-1"
              >
                {currentStep === totalSteps ? (
                  <>Submit <i className="ri-check-line"></i></>
                ) : (
                  <>Next <i className="ri-arrow-right-line"></i></>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
