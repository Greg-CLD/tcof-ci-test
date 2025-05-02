import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Stage } from '@/lib/plan-db';

interface StageSelectorProps {
  currentStage: Stage;
  onStageChange: (stage: Stage) => void;
}

export default function StageSelector({ currentStage, onStageChange }: StageSelectorProps) {
  const stages: Stage[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
  
  const stageDescriptions: Record<Stage, string> = {
    'Identification': 'Initial project discovery and understanding the problem space',
    'Definition': 'Clarifying scope, requirements, and planning the work',
    'Delivery': 'Executing the tasks and implementing solutions',
    'Closure': 'Reviewing outcomes and capturing lessons learned'
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="stage-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Project Stage
            </label>
            <Select
              value={currentStage}
              onValueChange={(value) => onStageChange(value as Stage)}
            >
              <SelectTrigger id="stage-selector" className="w-full">
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              {stageDescriptions[currentStage]}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}