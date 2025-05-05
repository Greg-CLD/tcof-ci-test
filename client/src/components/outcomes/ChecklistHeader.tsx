import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PlusCircle, Clock, Info, FileText } from "lucide-react";
import { format } from "date-fns";
import { useOutcomes } from "@/hooks/useOutcomes";
import { OutcomeSelectorModal } from "./OutcomeSelectorModal";
import { OutcomeRadarChart, type OutcomeRadarChartRef } from "./OutcomeRadarChart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { exportOutcomesToPDF } from "@/lib/pdfExport";
import { useQuery } from "@tanstack/react-query";

interface ChecklistHeaderProps {
  projectId: string;
}

export function ChecklistHeader({ projectId }: ChecklistHeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSelectingOutcomes, setIsSelectingOutcomes] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const radarChartRef = useRef<OutcomeRadarChartRef>(null);
  
  // Get project details for the PDF header
  const { data: projectData } = useQuery<{ id: string; name: string; description: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  const {
    selectedOutcomes,
    progressValues,
    latestProgress,
    allGoalMapOutcomes,
    updateProgress,
    isUpdatingProgress,
  } = useOutcomes({ projectId });
  
  // Format the last update timestamp
  const formatLastUpdate = (outcomeId: string): string => {
    const timestamp = latestProgress[outcomeId]?.updatedAt;
    if (!timestamp) return "";
    
    try {
      return format(new Date(timestamp), "yyyy-MM-dd");
    } catch (e) {
      return "";
    }
  };
  
  // Determine if user can edit outcome progress
  // For this implementation we'll check if user is authenticated
  const canEditProgress = !!user;
  
  // Handle PDF export
  const handleExportPDF = async () => {
    if (!user) return;
    
    try {
      setIsExporting(true);
      const svgElement = radarChartRef.current?.getSvgElement();
      
      if (!svgElement) {
        toast({
          title: "Export failed",
          description: "Could not create PDF from the chart.",
          variant: "destructive",
        });
        return;
      }
      
      // Use nullish coalescing to handle type safety
      const projectName = projectData && 'name' in projectData 
        ? projectData.name 
        : 'Project';
      
      const success = await exportOutcomesToPDF(
        projectName,
        svgElement,
        selectedOutcomes,
        Object.values(latestProgress)
      );
      
      if (success) {
        toast({
          title: "PDF ready!",
          description: "Check your downloads.",
          variant: "default",
        });
      } else {
        toast({
          title: "Export failed",
          description: "Unable to generate PDF.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export failed",
        description: "Unable to generate PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-4 mb-8">
      {selectedOutcomes.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Outcome Progress</h3>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={handleExportPDF}
                        disabled={!user || isExporting}
                      >
                        {isExporting ? (
                          <div className="animate-spin mr-1 h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 mr-1" />
                        )}
                        <span>{isExporting ? "Exporting..." : "📄 Export PDF"}</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!user && (
                    <TooltipContent>
                      <p>You must be logged in to export a PDF.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                {selectedOutcomes.map((outcome) => (
                  <div key={outcome.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{outcome.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="font-medium text-primary mr-2">
                          {progressValues[outcome.id] ?? 0}%
                        </span>
                        {formatLastUpdate(outcome.id) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            (Updated: {formatLastUpdate(outcome.id)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Slider
                              defaultValue={[progressValues[outcome.id] ?? 0]}
                              max={100}
                              step={5}
                              value={[progressValues[outcome.id] ?? 0]}
                              onValueChange={(value) => {
                                // Update local state immediately for responsive UI
                              }}
                              onValueCommit={(value) => {
                                // Only save to server when the slider is released
                                if (canEditProgress) {
                                  updateProgress(outcome.id, value[0]);
                                }
                              }}
                              disabled={!canEditProgress || isUpdatingProgress}
                              className={!canEditProgress ? "cursor-not-allowed opacity-70" : ""}
                            />
                          </div>
                        </TooltipTrigger>
                        {!canEditProgress && (
                          <TooltipContent>
                            <p>You need to be a Pro user to track outcome progress</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
                
                <div className="flex items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectingOutcomes(true)}
                    className="flex items-center gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Manage Outcomes</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-center items-center">
                <OutcomeRadarChart
                  ref={radarChartRef}
                  outcomes={selectedOutcomes}
                  outcomeProgress={Object.values(latestProgress)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedOutcomes.length === 0 && (
        <Card className="bg-white shadow-sm">
          <CardContent className="py-6 px-4 text-center">
            <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No outcomes selected</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Select up to 5 outcomes to track your project's progress.
            </p>
            <Button 
              variant="outline"
              onClick={() => setIsSelectingOutcomes(true)}
              className="flex items-center gap-1 mx-auto"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Select Outcomes</span>
            </Button>
          </CardContent>
        </Card>
      )}
      
      <OutcomeSelectorModal
        isOpen={isSelectingOutcomes}
        onClose={() => setIsSelectingOutcomes(false)}
        projectId={projectId}
        existingOutcomes={allGoalMapOutcomes}
      />
    </div>
  );
}