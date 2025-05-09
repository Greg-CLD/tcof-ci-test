import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Star, StarOff, Trash, Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PersonalHeuristic } from '@/lib/plan-db';

interface HeuristicListProps {
  heuristics: PersonalHeuristic[];
  onChange: (heuristics: PersonalHeuristic[]) => void;
  totalFavourites: number;
}

export default function HeuristicList({ 
  heuristics = [], 
  onChange,
  totalFavourites = 0 
}: HeuristicListProps) {
  const [newHeuristicText, setNewHeuristicText] = useState('');
  const [newHeuristicNotes, setNewHeuristicNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Log initial heuristics value to help with debugging
  React.useEffect(() => {
    console.log('🔄 HeuristicList mounted or updated with heuristics:', 
      Array.isArray(heuristics) ? heuristics.length : 'not an array', 
      JSON.stringify(heuristics));
  }, [heuristics]);
  
  // Ensure heuristics is always an array
  const safeHeuristics = Array.isArray(heuristics) ? heuristics : [];
  
  // Safely process heuristic changes with reliable data structure
  const processHeuristicChange = useCallback((updatedHeuristics: PersonalHeuristic[]) => {
    // Ensure each heuristic has all required properties
    const validatedHeuristics = updatedHeuristics.map(h => ({
      id: h.id || uuidv4(),
      text: typeof h.text === 'string' ? h.text : '',
      notes: typeof h.notes === 'string' ? h.notes : '',
      favourite: Boolean(h.favourite)
    }));
    
    // Log the validated data
    console.log('🔄 Validating heuristics before change:', 
      validatedHeuristics.length, 'heuristics');
    
    // Deep clone one more time for safety
    const safeData = JSON.parse(JSON.stringify(validatedHeuristics));
    
    // Call the parent change handler with validated data
    onChange(safeData);
  }, [onChange]);
  
  // Handle adding a new heuristic
  const handleAddHeuristic = useCallback(() => {
    if (!newHeuristicText.trim()) return;
    
    // Create new heuristic
    const newHeuristic: PersonalHeuristic = {
      id: uuidv4(),
      text: newHeuristicText.trim(),
      notes: newHeuristicNotes.trim(),
      favourite: false
    };
    
    console.log('🔄 Adding new heuristic:', JSON.stringify(newHeuristic));
    
    // Deep clone to avoid any reference issues
    const existingHeuristics = JSON.parse(JSON.stringify(safeHeuristics));
    
    // Create a new array by concatenating rather than modifying the existing one
    const updatedHeuristics = [...existingHeuristics, newHeuristic];
    
    // Process the change with validation
    processHeuristicChange(updatedHeuristics);
    
    // Reset form
    setNewHeuristicText('');
    setNewHeuristicNotes('');
    setIsOpen(false);
  }, [newHeuristicText, newHeuristicNotes, safeHeuristics, processHeuristicChange]);
  
  // Handle removing a heuristic
  const handleRemoveHeuristic = useCallback((id: string) => {
    console.log('🔄 Removing heuristic with ID:', id);
    
    // Deep clone to avoid any reference issues
    const existingHeuristics = JSON.parse(JSON.stringify(safeHeuristics));
    const updatedHeuristics = existingHeuristics.filter((h: PersonalHeuristic) => h.id !== id);
    
    console.log('🔄 After removal, heuristics count:', updatedHeuristics.length);
    processHeuristicChange(updatedHeuristics);
  }, [safeHeuristics, processHeuristicChange]);
  
  // Handle toggling favourite for a heuristic
  const handleToggleFavourite = useCallback((id: string) => {
    console.log('🔄 Toggling favourite for heuristic ID:', id);
    
    // Deep clone to avoid any reference issues
    const existingHeuristics = JSON.parse(JSON.stringify(safeHeuristics));
    const heuristic = existingHeuristics.find((h: PersonalHeuristic) => h.id === id);
    
    if (!heuristic) {
      console.warn('⚠️ Could not find heuristic with ID:', id);
      return;
    }
    
    // If already favourited, we can always unfavourite
    if (heuristic.favourite) {
      const updatedHeuristics = existingHeuristics.map((h: PersonalHeuristic) => 
        h.id === id ? { ...h, favourite: false } : h
      );
      console.log('🔄 Unfavourited heuristic, updated list count:', updatedHeuristics.length);
      processHeuristicChange(updatedHeuristics);
      return;
    }
    
    // Otherwise, check if we've reached the limit
    if (totalFavourites < 3) {
      const updatedHeuristics = existingHeuristics.map((h: PersonalHeuristic) => 
        h.id === id ? { ...h, favourite: true } : h
      );
      console.log('🔄 Favourited heuristic, updated list count:', updatedHeuristics.length);
      processHeuristicChange(updatedHeuristics);
    } else {
      console.warn('⚠️ Cannot favourite more than 3 heuristics');
    }
  }, [safeHeuristics, totalFavourites, processHeuristicChange]);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-tcof-dark">STEP 2 – Add Your Own Heuristics</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              disabled={heuristics.length >= 10}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Heuristic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Your Own Heuristic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="heuristic-text">Heuristic (80 chars max)</Label>
                <Input 
                  id="heuristic-text"
                  value={newHeuristicText}
                  onChange={(e) => setNewHeuristicText(e.target.value.slice(0, 80))}
                  placeholder="Enter your heuristic..."
                  maxLength={80}
                />
                <div className="text-xs text-right text-gray-500">
                  {newHeuristicText.length}/80
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="heuristic-notes">Notes (optional)</Label>
                <Textarea
                  id="heuristic-notes"
                  value={newHeuristicNotes}
                  onChange={(e) => setNewHeuristicNotes(e.target.value)}
                  placeholder="Add any additional notes or context..."
                  rows={3}
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewHeuristicText('');
                    setNewHeuristicNotes('');
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleAddHeuristic}
                  disabled={!newHeuristicText.trim()}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                >
                  Add Heuristic
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {heuristics.length === 0 ? (
        <div className="py-8 text-center border border-dashed rounded-lg">
          <p className="text-gray-500">No personal heuristics added yet. Add your own using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heuristics.map((heuristic) => (
            <div 
              key={heuristic.id} 
              className={`p-4 border rounded-lg flex items-start justify-between ${heuristic.favourite ? 'bg-tcof-bg' : 'bg-white'}`}
            >
              <div className="flex-1">
                <div className="font-medium">{heuristic.text}</div>
                {heuristic.notes && <div className="text-sm text-gray-600 mt-1">{heuristic.notes}</div>}
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleToggleFavourite(heuristic.id)}
                  disabled={!heuristic.favourite && totalFavourites >= 3}
                  className="text-amber-500"
                >
                  {heuristic.favourite ? (
                    <Star className="h-5 w-5 fill-amber-500" />
                  ) : (
                    <StarOff className="h-5 w-5" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveHeuristic(heuristic.id)}
                  className="text-red-500"
                >
                  <Trash className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Counter indicators */}
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <div>Heuristics: {heuristics.length}/10 max</div>
        <div>Favourites: {totalFavourites}/3 max</div>
      </div>
    </div>
  );
}