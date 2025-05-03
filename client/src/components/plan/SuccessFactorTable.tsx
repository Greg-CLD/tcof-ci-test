import React, { useState, useEffect } from 'react';
import { Star, StarOff, HelpCircle } from 'lucide-react';
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
import { SuccessFactorRating } from '@/lib/plan-db';

// Define rating information directly with proper typing
const ratingInfo: Record<number, { emoji: string; description: string }> = {
  1: { emoji: '❌', description: "Doesn't land - I don't believe this factor is relevant" },
  2: { emoji: '🤔', description: "Unfamiliar - I don't have enough context to judge" },
  3: { emoji: '⚠️', description: "Needs attention - This is a blind spot we need to address" },
  4: { emoji: '👍', description: "Important - This factor matters to our success" },
  5: { emoji: '🌟', description: "Essential - This is a critical success factor" }
};

// Rating descriptions for tooltips
const RATING_DESCRIPTIONS = {
  1: ratingInfo[1].description,
  2: ratingInfo[2].description,
  3: ratingInfo[3].description,
  4: ratingInfo[4].description,
  5: ratingInfo[5].description
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
  const [tcofFactors, setTcofFactors] = useState<Array<{id: string, name: string}>>([]);
  const [isRatingKeyOpen, setIsRatingKeyOpen] = useState(false);
  
  // Load TCOF factor data from API
  useEffect(() => {
    // Begin with sample data for immediate rendering
    const sampleFactors = [
      { id: 'H1', name: 'Loading success factors...' }
    ];
    
    setTcofFactors(sampleFactors);
    
    // Create dummy data for demo purposes
    const demoFactors = [
      { id: 'F1', name: 'Clear success criteria are defined' },
      { id: 'F2', name: 'Stakeholders are properly engaged' },
      { id: 'F3', name: 'Risks are managed appropriately' },
      { id: 'F4', name: 'Delivery approach matches the context' },
      { id: 'F5', name: 'Team has the right capabilities' }
    ];
    
    // Display demo data after short delay
    setTimeout(() => {
      setTcofFactors(demoFactors);
    }, 500);
    
    // Attempt to load data from API
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setTcofFactors(data.map((factor: any) => ({
              id: factor.id || '',
              name: factor.text || ''
            })));
          }
        }
      } catch (error) {
        console.error('Error loading TCOF tasks:', error);
      }
    };
    
    fetchData();
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
  
  // Get emoji for rating display using the rating info from tcofData
  const getRatingEmoji = (rating: number): string => {
    if (rating >= 1 && rating <= 5) {
      return ratingInfo[rating]?.emoji || '';
    }
    return '';
  };

  // Render loading state if no factors are loaded yet
  if (tcofFactors.length === 0) {
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
        
        <TooltipProvider>
          <Tooltip open={isRatingKeyOpen} onOpenChange={setIsRatingKeyOpen}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 flex items-center gap-1"
                onClick={() => setIsRatingKeyOpen(!isRatingKeyOpen)}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="text-xs">What do the emojis mean?</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3 max-w-md">
              <div className="text-sm mb-2 font-medium">Rating Key:</div>
              <div className="grid grid-cols-1 gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <div key={rating} className="flex items-center gap-2">
                    <span>{ratingInfo[rating].emoji} = {ratingInfo[rating].description}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
            {tcofFactors.map((factor, index) => {
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