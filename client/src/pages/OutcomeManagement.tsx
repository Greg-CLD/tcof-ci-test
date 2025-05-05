import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { OutcomeSelectorModal, type Outcome } from "@/components/outcomes/OutcomeSelectorModal";
import { OutcomeProgressTracker, type OutcomeProgress } from "@/components/outcomes/OutcomeProgressTracker";
import { OutcomeRadarChart } from "@/components/outcomes/OutcomeRadarChart";
import { generatePDF } from "@/lib/pdfExport";
import { useProjectContext } from "@/contexts/ProjectContext";

export default function OutcomeManagement() {
  const [, setLocation] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { toast } = useToast();
  const { currentProject } = useProjectContext();
  const [isSelectingOutcomes, setIsSelectingOutcomes] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Redirect if no projectId
  useEffect(() => {
    if (!projectId) {
      setLocation("/");
    }
  }, [projectId, setLocation]);
  
  // Define type for API response
  interface OutcomesResponse {
    selectedOutcomeIds: string[];
    customOutcomes: Outcome[];
  }
  
  // Fetch all data needed for the page
  const { data: outcomesData, isLoading: isLoadingOutcomes } = useQuery<OutcomesResponse>({
    queryKey: [`/api/projects/${projectId}/outcomes`],
    enabled: !!projectId,
  });
  
  const { data: outcomeProgress = [], isLoading: isLoadingProgress } = useQuery<OutcomeProgress[]>({
    queryKey: [`/api/projects/${projectId}/outcomes/progress`],
    enabled: !!projectId,
  });
  
  // Fetch goal map outcomes (note: this is a placeholder, adjust to match your actual API)
  const { data: goalMapOutcomes = [], isLoading: isLoadingGoalMapOutcomes } = useQuery<Outcome[]>({
    queryKey: ['/api/goal-maps/outcomes'],
    enabled: !!projectId,
  });
  
  // Prepare the list of selected outcomes
  const getSelectedOutcomes = (): Outcome[] => {
    if (!outcomesData || !outcomesData.selectedOutcomeIds) return [];
    
    const selectedIds = new Set(outcomesData.selectedOutcomeIds);
    const customOutcomes = outcomesData.customOutcomes || [];
    const allOutcomes = [...goalMapOutcomes, ...customOutcomes];
    
    return allOutcomes.filter(outcome => selectedIds.has(outcome.id));
  };
  
  const selectedOutcomes = getSelectedOutcomes();
  const isLoading = isLoadingOutcomes || isLoadingProgress || isLoadingGoalMapOutcomes;
  
  // Export PDF report
  const handleExportPDF = async () => {
    if (!currentProject) return;
    
    setExportingPDF(true);
    try {
      await generatePDF({
        projectName: currentProject.name,
        outcomes: selectedOutcomes,
        outcomeProgress: outcomeProgress || [],
      });
      
      toast({
        title: "Report exported",
        description: "Your outcome progress report has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "Failed to export your outcome progress report.",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };
  
  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-8">
      <PageHeader
        title="Outcome Progress Tracking"
        description="Track and visualize progress on your selected outcomes"
      >
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={exportingPDF || selectedOutcomes.length === 0}
          className="flex items-center gap-2"
        >
          {exportingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Export Report
            </>
          )}
        </Button>
      </PageHeader>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <OutcomeProgressTracker
              projectId={projectId}
              outcomes={selectedOutcomes}
              outcomeProgress={outcomeProgress || []}
              onSelectOutcomes={() => setIsSelectingOutcomes(true)}
            />
          </div>
          <div className="md:col-span-1">
            <OutcomeRadarChart
              outcomes={selectedOutcomes}
              outcomeProgress={outcomeProgress || []}
            />
          </div>
        </div>
      )}
      
      {/* Outcome selection modal */}
      <OutcomeSelectorModal
        isOpen={isSelectingOutcomes}
        onClose={() => setIsSelectingOutcomes(false)}
        projectId={projectId}
        existingOutcomes={goalMapOutcomes}
      />
    </div>
  );
}