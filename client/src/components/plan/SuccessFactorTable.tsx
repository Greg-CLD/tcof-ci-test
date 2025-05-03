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
import { getTcofData } from '@/lib/tcofData';

// Rating descriptions for tooltips
const RATING_DESCRIPTIONS = {
  1: 'Doesn\'t land',
  2: 'Unfamiliar',
  3: 'Seems true',
  4: 'Proven',
  5: 'Hard-won truth'
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
  
  // Load TCOF factor data
  useEffect(() => {
    const data = getTcofData();
    setTcofFactors(data.map(factor => ({
      id: factor.id,
      name: factor.name
    })));
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
  
  // Get emoji for rating display
  const getRatingEmoji = (rating: number): string => {
    switch(rating) {
      case 1: return '❌'; // Very negative
      case 2: return '🤔'; // Somewhat negative
      case 3: return '🟡'; // Neutral
      case 4: return '✅'; // Positive
      case 5: return '🔥'; // Very positive
      default: return '';
    }
  };

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
                <div className="flex items-center gap-2">
                  <span>❌ = Doesn't land</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🤔 = Unfamiliar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🟡 = Seems true</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅ = Proven</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔥 = Hard-won truth</span>
                </div>
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