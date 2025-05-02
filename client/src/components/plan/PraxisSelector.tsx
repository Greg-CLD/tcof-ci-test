import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { calculateZone, getZoneDescription, getFrameworksForZone } from '@/lib/goodPracticeData';
import styles from '@/lib/styles/gp.module.css';

interface PraxisSelectorProps {
  onZoneSelected: (zone: string, suggestedFrameworks: string[]) => void;
  initialZone?: string | null;
}

type ScopeValue = 'Small' | 'Medium' | 'Large';
type UncertaintyValue = 'Low' | 'Medium' | 'High';

export default function PraxisSelector({ onZoneSelected, initialZone = null }: PraxisSelectorProps) {
  const [scope, setScope] = useState<ScopeValue | null>(null);
  const [uncertainty, setUncertainty] = useState<UncertaintyValue | null>(null);
  const [zone, setZone] = useState<string | null>(initialZone);
  const [zoneDescription, setZoneDescription] = useState<string>('');

  useEffect(() => {
    if (scope && uncertainty) {
      const calculatedZone = calculateZone(scope, uncertainty);
      setZone(calculatedZone);
      
      if (calculatedZone) {
        setZoneDescription(getZoneDescription(calculatedZone));
      }
    }
  }, [scope, uncertainty]);

  const handleScopeChange = (value: string) => {
    setScope(value as ScopeValue);
  };

  const handleUncertaintyChange = (value: string) => {
    setUncertainty(value as UncertaintyValue);
  };

  const handleConfirmZone = () => {
    if (zone) {
      const suggestedFrameworks = getFrameworksForZone(zone);
      onZoneSelected(zone, suggestedFrameworks);
    }
  };

  // Map coordinates for quadrants in SVG
  const quadrantCoords = {
    'Zone A': [0, 0],
    'Zone B': [1, 0],
    'Zone C': [0, 1],
    'Zone D': [1, 1],
    'Zone E': [1, 2],
  };

  // Get active cell coordinates based on selected scope and uncertainty
  const getActiveCellCoords = () => {
    if (!zone) return null;
    return quadrantCoords[zone as keyof typeof quadrantCoords];
  };

  const activeCellCoords = getActiveCellCoords();

  return (
    <div className={styles.praxisSelector}>
      <div className={styles.questionCard}>
        <div className={styles.questionLabel}>Q1: What is the scope of your project?</div>
        <RadioGroup value={scope || ''} onValueChange={handleScopeChange}>
          <div className={styles.radioGroup}>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="Small" id="scope-small" />
              <Label htmlFor="scope-small" className="ml-2">Small</Label>
            </div>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="Medium" id="scope-medium" />
              <Label htmlFor="scope-medium" className="ml-2">Medium</Label>
            </div>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="Large" id="scope-large" />
              <Label htmlFor="scope-large" className="ml-2">Large</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className={styles.questionCard}>
        <div className={styles.questionLabel}>Q2: How much uncertainty is there in your project?</div>
        <RadioGroup value={uncertainty || ''} onValueChange={handleUncertaintyChange}>
          <div className={styles.radioGroup}>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="Low" id="uncertainty-low" />
              <Label htmlFor="uncertainty-low" className="ml-2">Low</Label>
            </div>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="Medium" id="uncertainty-medium" />
              <Label htmlFor="uncertainty-medium" className="ml-2">Medium</Label>
            </div>
            <div className={styles.radioLabel}>
              <RadioGroupItem value="High" id="uncertainty-high" />
              <Label htmlFor="uncertainty-high" className="ml-2">High</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {scope && uncertainty && (
        <>
          <div className="flex justify-center my-4">
            <svg className={styles.quadrantGrid} viewBox="0 0 300 300">
              {/* Grid lines */}
              <line x1="0" y1="100" x2="300" y2="100" stroke="#d1d5db" />
              <line x1="0" y1="200" x2="300" y2="200" stroke="#d1d5db" />
              <line x1="150" y1="0" x2="150" y2="300" stroke="#d1d5db" />
              
              {/* Quadrant cells */}
              <rect
                x="0" y="0" width="150" height="100"
                className={zone === 'Zone A' ? styles.quadrantCellActive : styles.quadrantCell}
              />
              <rect
                x="150" y="0" width="150" height="100"
                className={zone === 'Zone B' ? styles.quadrantCellActive : styles.quadrantCell}
              />
              <rect
                x="0" y="100" width="150" height="100"
                className={zone === 'Zone C' ? styles.quadrantCellActive : styles.quadrantCell}
              />
              <rect
                x="150" y="100" width="150" height="100"
                className={zone === 'Zone D' ? styles.quadrantCellActive : styles.quadrantCell}
              />
              <rect
                x="150" y="200" width="150" height="100"
                className={zone === 'Zone E' ? styles.quadrantCellActive : styles.quadrantCell}
              />
              
              {/* Quadrant labels */}
              <text x="75" y="50" textAnchor="middle" className={styles.quadrantLabel}>Zone A</text>
              <text x="225" y="50" textAnchor="middle" className={styles.quadrantLabel}>Zone B</text>
              <text x="75" y="150" textAnchor="middle" className={styles.quadrantLabel}>Zone C</text>
              <text x="225" y="150" textAnchor="middle" className={styles.quadrantLabel}>Zone D</text>
              <text x="225" y="250" textAnchor="middle" className={styles.quadrantLabel}>Zone E</text>
              
              {/* Axis labels */}
              <text x="150" y="20" textAnchor="middle" className={styles.quadrantAxisLabel}>Small</text>
              <text x="150" y="120" textAnchor="middle" className={styles.quadrantAxisLabel}>Medium</text>
              <text x="150" y="220" textAnchor="middle" className={styles.quadrantAxisLabel}>Large</text>
              <text x="75" y="280" textAnchor="middle" className={styles.quadrantAxisLabel}>Low</text>
              <text x="225" y="280" textAnchor="middle" className={styles.quadrantAxisLabel}>High</text>
              <text x="150" y="295" textAnchor="middle" className={styles.quadrantAxisLabel}>Uncertainty</text>
            </svg>
          </div>

          <div className={styles.zoneCard}>
            <div className={styles.zoneTitle}>{zone}</div>
            <div className={styles.zoneDescription}>{zoneDescription}</div>
            <Button 
              onClick={handleConfirmZone}
              disabled={!zone}
            >
              Accept Zone & Continue
            </Button>
          </div>
        </>
      )}
    </div>
  );
}