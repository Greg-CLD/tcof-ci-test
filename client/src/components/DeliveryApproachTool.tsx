import React, { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import ZoneResultCard from './ZoneResultCard';
import '../styles/approach.css';

// Import delivery zones data
// This is a workaround for TypeScript import issues with JSON files
const deliveryZonesData = [
  {
    "zone": "Zone A",
    "alias": "Fast & Focused",
    "summary": "Small scope, low uncertainty. Classic plan-then-do approach with predictable outcomes.",
    "methods": ["Waterfall", "Critical Path Scheduling", "PRINCE2"],
    "tools":   ["Gantt Charts", "PERT", "Basic Risk Log"]
  },
  {
    "zone": "Zone B",
    "alias": "Adaptive Projects",
    "summary": "Medium scope, low-medium uncertainty. Balance structure with adaptability.",
    "methods": ["Hybrid PM", "Iterative Planning", "MSP"],
    "tools":   ["Rolling Wave", "Scrum-of-Scrums", "Burndown Chart"]
  },
  {
    "zone": "Zone C",
    "alias": "Iterative Delivery",
    "summary": "Higher uncertainty requires more feedback cycles. Time-boxed iterations with regular reviews.",
    "methods": ["Scrum", "Kanban", "Adaptive Project Management"],
    "tools":   ["User Stories", "Kanban Board", "Retrospectives"]
  },
  {
    "zone": "Zone D",
    "alias": "Agile/Hybrid Delivery",
    "summary": "Complex scope with evolving requirements. Blend best of agile with some structure.",
    "methods": ["SAFe", "Disciplined Agile", "Hybrid Methods"],
    "tools":   ["Program Boards", "Increment Planning", "Feature Mapping"]
  },
  {
    "zone": "Zone E",
    "alias": "Complex Adaptive",
    "summary": "High scope, high uncertainty. Focus on emergence and continuous adaptation.",
    "methods": ["Systems Thinking", "Complex Adaptive Leadership"],
    "tools":   ["Causal Loop Diagrams", "Monte-Carlo Simulation", "Adaptive Strategy Maps"]
  },
  {
    "zone": "Zone F",
    "alias": "Systems Thinking",
    "summary": "For outliers with extreme complexity. Focus on patterns, interconnections and system dynamics.",
    "methods": ["Complexity Leadership", "Cynefin Framework", "Strategic Design"],
    "tools":   ["Social Network Analysis", "Pattern Recognition", "Emergent Strategy"]
  }
];

interface DeliveryZone {
  zone: string;
  alias: string;
  summary: string;
  methods: string[];
  tools: string[];
}

export interface DeliveryApproachData {
  scope: 'Small' | 'Medium' | 'Large';
  uncertainty: 'Low' | 'Medium' | 'High';
  zone: string;
  methods: string[];
  tools: string[];
}

interface DeliveryApproachToolProps {
  initial?: DeliveryApproachData | null;
  onSave?: (data: DeliveryApproachData) => void;
}

const DeliveryApproachTool: React.FC<DeliveryApproachToolProps> = ({ initial, onSave }) => {
  const [scope, setScope] = useState<'Small' | 'Medium' | 'Large' | null>(initial?.scope || null);
  const [uncertainty, setUncertainty] = useState<'Low' | 'Medium' | 'High' | null>(initial?.uncertainty || null);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);

  // Zone mapping matrix - Flipped to match Praxis Framework with X-axis representing Scope
  // and Y-axis representing Uncertainty (High at top, Low at bottom)
  const zoneMatrix = {
    Small: {
      Low: 'Zone A',    // Small scope, Low uncertainty
      Medium: 'Zone B', // Small scope, Medium uncertainty
      High: 'Zone F'    // Small scope, High uncertainty
    },
    Medium: {
      Low: 'Zone B',    // Medium scope, Low uncertainty
      Medium: 'Zone C', // Medium scope, Medium uncertainty
      High: 'Zone D'    // Medium scope, High uncertainty
    },
    Large: {
      Low: 'Zone C',    // Large scope, Low uncertainty
      Medium: 'Zone D', // Large scope, Medium uncertainty
      High: 'Zone E'    // Large scope, High uncertainty
    }
  };

  // Update the selected zone based on scope and uncertainty
  useEffect(() => {
    if (scope && uncertainty) {
      const zoneKey = zoneMatrix[scope][uncertainty];
      const zoneData = deliveryZonesData.find((z: DeliveryZone) => z.zone === zoneKey);
      if (zoneData) {
        setSelectedZone(zoneData as DeliveryZone);
      }
    } else {
      setSelectedZone(null);
    }
  }, [scope, uncertainty]);

  // Load initial zone if provided
  useEffect(() => {
    if (initial?.zone) {
      const zoneData = deliveryZonesData.find((z: DeliveryZone) => z.zone === initial.zone);
      if (zoneData) {
        setSelectedZone(zoneData as DeliveryZone);
      }
    }
  }, [initial]);

  // Handle adding the approach to the plan
  const handleAddToPlan = () => {
    if (selectedZone && scope && uncertainty) {
      const data: DeliveryApproachData = {
        scope,
        uncertainty,
        zone: selectedZone.zone,
        methods: selectedZone.methods,
        tools: selectedZone.tools
      };
      
      if (onSave) {
        onSave(data);
      }
    }
  };

  return (
    <div className="my-6">
      <h3 className="text-xl font-bold text-tcof-dark mb-4">Delivery Approach Tool</h3>
      <p className="text-gray-700 mb-6">
        Use this tool to identify the right delivery approach. Based on your project's scope and clarity, 
        we'll recommend styles and techniques to guide your next steps.
      </p>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Question 1: Scope */}
            <div>
              <h4 className="text-lg font-semibold text-tcof-dark mb-3">Question 1: Project Scope</h4>
              <p className="text-gray-600 mb-4">
                How large is the scope of your initiative?
              </p>
              
              <RadioGroup
                value={scope || ''}
                onValueChange={(val) => setScope(val as 'Small' | 'Medium' | 'Large')}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Small" id="scope-small" />
                  <Label htmlFor="scope-small" className="cursor-pointer">
                    Small <span className="text-gray-500 text-sm">(Single team, well-defined work)</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Medium" id="scope-medium" />
                  <Label htmlFor="scope-medium" className="cursor-pointer">
                    Medium <span className="text-gray-500 text-sm">(Multiple teams, moderate complexity)</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Large" id="scope-large" />
                  <Label htmlFor="scope-large" className="cursor-pointer">
                    Large <span className="text-gray-500 text-sm">(Program-scale, high complexity)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Question 2: Uncertainty */}
            <div>
              <h4 className="text-lg font-semibold text-tcof-dark mb-3">Question 2: Level of Uncertainty</h4>
              <p className="text-gray-600 mb-4">
                How much uncertainty exists around requirements, outcomes, or approach?
              </p>
              
              <RadioGroup
                value={uncertainty || ''}
                onValueChange={(val) => setUncertainty(val as 'Low' | 'Medium' | 'High')}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Low" id="uncertainty-low" />
                  <Label htmlFor="uncertainty-low" className="cursor-pointer">
                    Low <span className="text-gray-500 text-sm">(Clear requirements, known solutions)</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Medium" id="uncertainty-medium" />
                  <Label htmlFor="uncertainty-medium" className="cursor-pointer">
                    Medium <span className="text-gray-500 text-sm">(Some unknowns, evolving requirements)</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="High" id="uncertainty-high" />
                  <Label htmlFor="uncertainty-high" className="cursor-pointer">
                    High <span className="text-gray-500 text-sm">(Novel situation, rapidly changing, exploratory)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          {/* Praxis Quadrant Visualization - Flipped to match Praxis Framework */}
          {(scope || uncertainty) && (
            <div className="da-grid mt-8">
              <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                {/* Grid */}
                <rect x="0" y="0" width="300" height="300" fill="#f8f9fa" stroke="#ddd" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="#ddd" strokeWidth="1" />
                <line x1="0" y1="200" x2="300" y2="200" stroke="#ddd" strokeWidth="1" />
                <line x1="100" y1="0" x2="100" y2="300" stroke="#ddd" strokeWidth="1" />
                <line x1="200" y1="0" x2="200" y2="300" stroke="#ddd" strokeWidth="1" />
                
                {/* Zone labels */}
                <text x="50" y="250" textAnchor="middle" fontSize="14" fill="#555">Zone A</text>
                <text x="150" y="250" textAnchor="middle" fontSize="14" fill="#555">Zone B</text>
                <text x="250" y="250" textAnchor="middle" fontSize="14" fill="#555">Zone C</text>
                <text x="50" y="150" textAnchor="middle" fontSize="14" fill="#555">Zone B</text>
                <text x="150" y="150" textAnchor="middle" fontSize="14" fill="#555">Zone C</text>
                <text x="250" y="150" textAnchor="middle" fontSize="14" fill="#555">Zone D</text>
                <text x="50" y="50" textAnchor="middle" fontSize="14" fill="#555">Zone F</text>
                <text x="150" y="50" textAnchor="middle" fontSize="14" fill="#555">Zone D</text>
                <text x="250" y="50" textAnchor="middle" fontSize="14" fill="#555">Zone E</text>
                
                {/* X and Y axis labels - Flipped with Scope on X-axis */}
                <text x="150" y="295" textAnchor="middle" fontSize="12" fill="#333">Scope</text>
                <text x="50" y="295" textAnchor="middle" fontSize="10" fill="#666">Small</text>
                <text x="150" y="295" textAnchor="middle" fontSize="10" fill="#666">Medium</text>
                <text x="250" y="295" textAnchor="middle" fontSize="10" fill="#666">Large</text>
                
                <text x="5" y="150" textAnchor="middle" fontSize="12" fill="#333" transform="rotate(-90, 5, 150)">Uncertainty</text>
                <text x="20" y="250" textAnchor="middle" fontSize="10" fill="#666">Low</text>
                <text x="20" y="150" textAnchor="middle" fontSize="10" fill="#666">Medium</text>
                <text x="20" y="50" textAnchor="middle" fontSize="10" fill="#666">High</text>
                
                {/* Highlight selected cell - Flipped coordinates */}
                {scope && uncertainty && (
                  <rect
                    x={scope === 'Small' ? 0 : scope === 'Medium' ? 100 : 200}
                    y={uncertainty === 'Low' ? 200 : uncertainty === 'Medium' ? 100 : 0}
                    width="100"
                    height="100"
                    fill="#008080"
                    fillOpacity="0.3"
                    stroke="#008080"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Results Card */}
      {selectedZone && (
        <ZoneResultCard
          zoneData={selectedZone}
          onAddToPlan={handleAddToPlan}
        />
      )}
    </div>
  );
};

export default DeliveryApproachTool;