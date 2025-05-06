import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Heuristic {
  id: string;
  organisationId: string;
  successFactor: string;
  goal?: string | null;
  metric?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HeuristicsEditorProps {
  defaults: Heuristic[];
  onSave: (updated: Heuristic[]) => void;
  onCancel?: () => void;
}

export function HeuristicsEditor({ defaults = [], onSave, onCancel }: HeuristicsEditorProps) {
  // Create a deep copy of defaults to avoid modifying the original
  const [heuristics, setHeuristics] = useState<Heuristic[]>(
    defaults.map(h => ({ ...h }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (index: number, field: keyof Heuristic, value: string) => {
    const updated = [...heuristics];
    // @ts-ignore - We know these fields are string-assignable
    updated[index][field] = value;
    setHeuristics(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(heuristics);
    } finally {
      setIsSaving(false);
    }
  };

  const addNewHeuristic = () => {
    if (heuristics.length === 0 && defaults.length > 0) {
      // Use the first default's organisationId if available
      const organisationId = defaults[0].organisationId;
      setHeuristics([
        {
          id: crypto.randomUUID(),
          organisationId,
          successFactor: "",
          goal: "",
          metric: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      return;
    }

    // Otherwise add to existing list
    setHeuristics([
      ...heuristics,
      {
        id: crypto.randomUUID(),
        organisationId: heuristics[0].organisationId,
        successFactor: "",
        goal: "",
        metric: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  };

  const removeHeuristic = (index: number) => {
    const updated = [...heuristics];
    updated.splice(index, 1);
    setHeuristics(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-tcof-dark">Edit Organisation Defaults</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addNewHeuristic} 
          disabled={isSaving}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Heuristic
        </Button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {heuristics.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No default heuristics yet. Add some to get started.</p>
          </div>
        ) : (
          heuristics.map((heuristic, index) => (
            <Card key={heuristic.id} className="border-tcof-light">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Heuristic {index + 1}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeHeuristic(index)}
                    disabled={isSaving}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor={`factor-${index}`}>Success Factor</Label>
                  <Input 
                    id={`factor-${index}`}
                    value={heuristic.successFactor || ""}
                    onChange={(e) => handleChange(index, "successFactor", e.target.value)}
                    placeholder="e.g., Ask Why"
                    disabled={isSaving}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`goal-${index}`}>Goal (optional)</Label>
                  <Textarea
                    id={`goal-${index}`}
                    value={heuristic.goal || ""}
                    onChange={(e) => handleChange(index, "goal", e.target.value)}
                    placeholder="What is the goal of this success factor?"
                    disabled={isSaving}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`metric-${index}`}>Metric (optional)</Label>
                  <Textarea
                    id={`metric-${index}`}
                    value={heuristic.metric || ""}
                    onChange={(e) => handleChange(index, "metric", e.target.value)}
                    placeholder="How will you measure success?"
                    disabled={isSaving}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}