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
  heuristics = [], // Provide a default empty array to prevent undefined errors
  mappings = [], // Provide a default empty array to prevent undefined errors
  onMappingChange
}: SuccessFactorMappingProps) {
  const [factorOptions, setFactorOptions] = useState<Array<{ value: string; label: string }>>([]);
  
  useEffect(() => {
    // Get factor options from tcofData utility
    const options = getTcofFactorOptions();
    if (options.length > 0) {
      // Use the options if available
      setFactorOptions([
        { value: '', label: 'Select a success factor...' },
        ...options
      ]);
    } else {
      // Fall back to default options if utility returns empty array
      const defaultOptions = [
        { value: 'F1', label: 'F1: Clear success criteria are defined' },
        { value: 'F2', label: 'F2: Stakeholders are properly engaged' },
        { value: 'F3', label: 'F3: Risks are managed appropriately' },
        { value: 'F4', label: 'F4: Delivery approach matches the context' },
        { value: 'F5', label: 'F5: Team has the right capabilities' }
      ];
      
      setFactorOptions([
        { value: '', label: 'Select a success factor...' },
        ...defaultOptions
      ]);
    }
    
    // Also try to fetch from API
    const fetchFactors = async () => {
      try {
        const response = await fetch('/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const apiOptions = data.map((factor: any) => ({
              value: factor.id || '',
              label: `${factor.id}: ${factor.text || ''}`
            }));
            
            setFactorOptions([
              { value: '', label: 'Select a success factor...' },
              ...apiOptions
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching factor options:', error);
      }
    };
    
    fetchFactors();
  }, []);

  const handleFactorChange = async (heuristicId: string, factorId: string | null) => {
    try {
      // Try to add the mapping
      await addMapping(planId, heuristicId, factorId, stage);
      // Notify parent component that mapping has changed
      onMappingChange();
    } catch (error) {
      console.error('Error adding mapping:', error);
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