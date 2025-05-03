import React, { useState, useEffect } from 'react';
import { Star, StarOff, HelpCircle, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SuccessFactorRating } from '@/lib/plan-db';

import { getSuccessFactorRatingInfo } from '@/lib/tcofData';
import { loadFactors, validateFactorTitles, TCOFFactor } from '@/utils/factorLoader';

// Custom rating scale with new descriptions per requirements
const RATING_SCALE = {
  1: { emoji: "❌", description: "Doesn't land – I don't feel this. It doesn't match my experience." },
  2: { emoji: "🤔", description: "Unfamiliar – I understand it, but I've never used it or seen it in action." },
  3: { emoji: "🟡", description: "Seems true – I believe it's useful, but I haven't tested it myself." },
  4: { emoji: "✅", description: "Proven – I've used this and it worked. It fits how I lead." },
  5: { emoji: "🔥", description: "Hard-won truth – I've lived this. It's burned into how I work." }
};

// Rating descriptions for tooltips
const RATING_DESCRIPTIONS = {
  1: RATING_SCALE[1].description,
  2: RATING_SCALE[2].description,
  3: RATING_SCALE[3].description,
  4: RATING_SCALE[4].description,
  5: RATING_SCALE[5].description
};

interface SuccessFactorTableProps {
  ratings: Record<string, SuccessFactorRating>;
  onChange: (factorId: string, rating: SuccessFactorRating) => void;
  totalFavourites: number;
}

export default function SuccessFactorTable({ 
  ratings = {}, 
  onChange,
  totalFavourites = 0
}: SuccessFactorTableProps) {
  const [factorList, setFactorList] = useState<Array<{id: string, name: string}>>([]);
  const [isRatingKeyOpen, setIsRatingKeyOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
  // Load TCOF factor data from Excel using factorLoader
  useEffect(() => {
    // Begin with sample data for immediate rendering
    const sampleFactors = [
      { id: 'H1', name: 'Loading success factors...' }
    ];
    
    setFactorList(sampleFactors);
    
    // Load factors from Excel
    async function loadExcelFactors() {
      try {
        const factors = await loadFactors();
        
        if (factors && Array.isArray(factors) && factors.length > 0) {
          // Map the Excel factors to the required format
          const formattedFactors = factors.map(factor => ({
            id: factor.id,
            name: factor.title
          }));
          
          setFactorList(formattedFactors);
          
          // Store rendered titles for validation
          const renderedTitles = formattedFactors.map(f => f.name);
          
          // Dev-time validation that the titles match our source data
          if (process.env.NODE_ENV === 'development') {
            validateFactorTitles(renderedTitles);
          }
        } else {
          // Fallback to demo data if Excel loading fails
          console.error('No factors loaded from Excel, using fallback data');
          const demoFactors = [
            { id: 'F1', name: 'Clear success criteria are defined' },
            { id: 'F2', name: 'Stakeholders are properly engaged' },
            { id: 'F3', name: 'Risks are managed appropriately' },
            { id: 'F4', name: 'Delivery approach matches the context' },
            { id: 'F5', name: 'Team has the right capabilities' }
          ];
          
          setFactorList(demoFactors);
        }
      } catch (error) {
        console.error('Error loading factors from Excel:', error);
        // Fallback data
        const fallbackFactors = [
          { id: 'F1', name: 'Clear success criteria are defined' },
          { id: 'F2', name: 'Stakeholders are properly engaged' },
          { id: 'F3', name: 'Risks are managed appropriately' },
          { id: 'F4', name: 'Delivery approach matches the context' },
          { id: 'F5', name: 'Team has the right capabilities' }
        ];
        
        setFactorList(fallbackFactors);
      }
    }
    
    loadExcelFactors();
  }, []);
  
  // Helper to get the current rating for display
  const getRating = (factorId: string): SuccessFactorRating => {
    return ratings[factorId] || { rating: 0 as any, notes: '', favourite: false };
  };
  
  // Handle rating change
  const handleRatingChange = (factorId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    const currentRating = getRating(factorId);
    onChange(factorId, {
      ...currentRating,
      rating
    });
  };
  
  // Handle notes change
  const handleNotesChange = (factorId: string, notes: string) => {
    const currentRating = getRating(factorId);
    onChange(factorId, {
      ...currentRating,
      notes
    });
  };
  
  // Handle favourite toggle
  const handleFavouriteToggle = (factorId: string) => {
    const currentRating = getRating(factorId);
    
    // If it's already favourited, we can always unfavourite
    if (currentRating.favourite) {
      onChange(factorId, {
        ...currentRating,
        favourite: false
      });
      return;
    }
    
    // Otherwise, check if we haven't reached max favourites
    if (totalFavourites < 3) {
      onChange(factorId, {
        ...currentRating,
        favourite: true
      });
    }
  };
  
  // Get emoji for rating display using our custom rating scale
  const getRatingEmoji = (rating: number): string => {
    if (rating >= 1 && rating <= 5) {
      return RATING_SCALE[rating as keyof typeof RATING_SCALE]?.emoji || '';
    }
    return '';
  };

  // Render loading state if no factors are loaded yet
  if (factorList.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-tcof-dark">STEP 1 – Reflect on TCOF Heuristics</h2>
        <div className="text-center py-8">Loading factors...</div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-tcof-dark">STEP 1 – Reflect on TCOF Heuristics</h2>
        
        <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-tcof-teal flex items-center gap-1"
            >
              <Info className="h-4 w-4" />
              <span className="text-xs">Rating key</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rating Key</DialogTitle>
              <DialogDescription>
                Use these ratings to reflect on your experience with each heuristic
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {[1, 2, 3, 4, 5].map(rating => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{RATING_SCALE[rating as keyof typeof RATING_SCALE].emoji}</span>
                  <span className="font-medium">{RATING_SCALE[rating as keyof typeof RATING_SCALE].description}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Factor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Rating</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Notes</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Favourite</th>
            </tr>
          </thead>
          <tbody>
            {factorList.map((factor: {id: string, name: string}, index: number) => {
              const currentRating = getRating(factor.id);
              const isStarred = currentRating.favourite;
              const rowClass = isStarred ? 'bg-tcof-bg' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              
              return (
                <tr key={factor.id} className={rowClass}>
                  <td className="px-4 py-3 font-medium">{factor.id} {factor.name}</td>
                  <td className="px-4 py-3">
                    <RadioGroup 
                      value={currentRating.rating?.toString() || ""} 
                      onValueChange={(value) => handleRatingChange(factor.id, parseInt(value) as 1 | 2 | 3 | 4 | 5)}
                      className="flex space-x-2"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex items-center space-x-1">
                          <RadioGroupItem 
                            id={`${factor.id}-${num}`} 
                            value={num.toString()} 
                            title={RATING_DESCRIPTIONS[num as keyof typeof RATING_DESCRIPTIONS]}
                          />
                          <Label 
                            htmlFor={`${factor.id}-${num}`} 
                            className="cursor-pointer"
                            title={RATING_DESCRIPTIONS[num as keyof typeof RATING_DESCRIPTIONS]}
                          >
                            {num} {getRatingEmoji(num)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </td>
                  <td className="px-4 py-3">
                    <Input 
                      placeholder="Add notes here..." 
                      value={currentRating.notes || ''}
                      onChange={(e) => handleNotesChange(factor.id, e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleFavouriteToggle(factor.id)}
                      disabled={!currentRating.favourite && totalFavourites >= 3}
                      className="text-amber-500"
                    >
                      {currentRating.favourite ? (
                        <Star className="h-5 w-5 fill-amber-500" />
                      ) : (
                        <StarOff className="h-5 w-5" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Favourite limit indicator */}
      <div className="text-sm text-gray-600 mt-2">
        Favourites: {totalFavourites}/3 max
      </div>
    </div>
  );
}