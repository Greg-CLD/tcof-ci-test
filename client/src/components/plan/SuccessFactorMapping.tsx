import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PersonalHeuristic, Stage, addMapping } from '@/lib/plan-db';
import { getTcofFactorOptions } from '@/lib/tcofData';
import styles from '@/lib/styles/tasks.module.css';
import { ChevronRight } from 'lucide-react';

interface SuccessFactorMappingProps {
  planId: string;
  stage: Stage;
  heuristics: PersonalHeuristic[];
  mappings: { heuristicId: string; factorId: string | null }[];
  onMappingChange: () => void;
}

export default function SuccessFactorMapping({
  planId,
  stage,
  heuristics,
  mappings,
  onMappingChange
}: SuccessFactorMappingProps) {
  const [factorOptions, setFactorOptions] = useState<Array<{ value: string; label: string }>>([]);
  
  useEffect(() => {
    // Get TCOF factor options
    const options = getTcofFactorOptions();
    setFactorOptions([
      { value: '', label: 'Select a success factor...' },
      ...options
    ]);
  }, []);

  const handleFactorChange = (heuristicId: string, factorId: string | null) => {
    if (addMapping(planId, heuristicId, factorId, stage)) {
      onMappingChange();
    }
  };

  // Get current mapping for a heuristic
  const getFactorForHeuristic = (heuristicId: string) => {
    const mapping = mappings.find(m => m.heuristicId === heuristicId);
    return mapping?.factorId || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Map Personal Heuristics to Success Factors</CardTitle>
        <CardDescription>
          Connect your personal heuristics to TCOF success factors to generate relevant tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {heuristics.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No personal heuristics found. Please add heuristics in the Discover phase.
          </div>
        ) : (
          <div className="space-y-3">
            {heuristics.map(heuristic => (
              <div key={heuristic.id} className={styles.mappingRow}>
                <div className={styles.heuristicText}>
                  <Label className="block text-sm font-medium mb-1">Personal Heuristic</Label>
                  <div>{heuristic.text}</div>
                </div>
                <ChevronRight className="mx-4 text-muted-foreground" />
                <div className={styles.factorSelect}>
                  <Label className="block text-sm font-medium mb-1">TCOF Success Factor</Label>
                  <Select
                    value={getFactorForHeuristic(heuristic.id)}
                    onValueChange={(value) => handleFactorChange(heuristic.id, value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a success factor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {factorOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}