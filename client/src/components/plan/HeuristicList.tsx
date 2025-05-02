import React, { useState } from 'react';
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
  const [isAddingHeuristic, setIsAddingHeuristic] = useState(false);
  const [newHeuristicText, setNewHeuristicText] = useState('');
  const [newHeuristicNotes, setNewHeuristicNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Handle adding a new heuristic
  const handleAddHeuristic = () => {
    if (!newHeuristicText.trim()) return;
    
    // Create new heuristic
    const newHeuristic: PersonalHeuristic = {
      id: uuidv4(),
      text: newHeuristicText.trim(),
      notes: newHeuristicNotes.trim(),
      favourite: false
    };
    
    // Add to list
    const updatedHeuristics = [...heuristics, newHeuristic];
    onChange(updatedHeuristics);
    
    // Reset form
    setNewHeuristicText('');
    setNewHeuristicNotes('');
    setIsOpen(false);
  };
  
  // Handle removing a heuristic
  const handleRemoveHeuristic = (id: string) => {
    const updatedHeuristics = heuristics.filter(h => h.id !== id);
    onChange(updatedHeuristics);
  };
  
  // Handle toggling favourite for a heuristic
  const handleToggleFavourite = (id: string) => {
    const heuristic = heuristics.find(h => h.id === id);
    if (!heuristic) return;
    
    // If already favourited, we can always unfavourite
    if (heuristic.favourite) {
      const updatedHeuristics = heuristics.map(h => 
        h.id === id ? { ...h, favourite: false } : h
      );
      onChange(updatedHeuristics);
      return;
    }
    
    // Otherwise, check if we've reached the limit
    if (totalFavourites < 3) {
      const updatedHeuristics = heuristics.map(h => 
        h.id === id ? { ...h, favourite: true } : h
      );
      onChange(updatedHeuristics);
    }
  };

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