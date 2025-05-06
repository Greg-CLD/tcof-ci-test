import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeuristicsEditor } from "@/components/HeuristicsEditor";
import SiteFooter from "@/components/SiteFooter";

interface Heuristic {
  id: string;
  organisationId: string;
  successFactor: string;
  goal?: string | null;
  metric?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Organisation {
  id: string;
  name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
}

export default function OrganisationHeuristicsPage() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { orgId } = useParams<{ orgId: string }>();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch organisation details
  const { 
    data: organisation, 
    isLoading: orgLoading, 
    error: orgError 
  } = useQuery({
    queryKey: ['organisation', orgId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organisations/${orgId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch organisation details");
      }
      return res.json();
    }
  });

  // Fetch organisation default heuristics
  const {
    data: heuristics = [],
    isLoading: heuristicsLoading,
    error: heuristicsError
  } = useQuery({
    queryKey: ['orgHeuristics', orgId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/organisations/${orgId}/heuristics`);
      if (!res.ok) {
        throw new Error("Failed to fetch organisation heuristics");
      }
      return res.json();
    }
  });



  // Handle navigation back to organisation dashboard
  const navigateToOrganisation = () => {
    navigate(`/organisations/${orgId}`);
  };

  // Display error toasts using useEffect to prevent infinite re-renders
  useEffect(() => {
    if (orgError) {
      toast({
        title: "Error",
        description: "Failed to fetch organisation details. Please try again.",
        variant: "destructive"
      });
    }
  }, [orgError, toast]);

  useEffect(() => {
    if (heuristicsError) {
      toast({
        title: "Error",
        description: "Failed to fetch organisation heuristics. Please try again.",
        variant: "destructive"
      });
    }
  }, [heuristicsError, toast]);

  const isLoading = orgLoading || heuristicsLoading;
  const canEdit = organisation?.role === 'owner' || organisation?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={navigateToOrganisation}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organisation
          </Button>
          
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-tcof-teal" />
              <h1 className="text-3xl font-bold text-tcof-dark">Loading organisation...</h1>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-tcof-dark">
                  {organisation?.name}: Default Success Factors
                </h1>
                <p className="text-gray-600 mt-2">
                  These factors will be used as defaults for new projects in this organisation.
                </p>
              </div>
              
              {canEdit && !isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Success Factors
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
              </div>
            ) : isEditing ? (
              <HeuristicsEditor 
                defaults={heuristics}
                organisationId={orgId}
                onClose={() => setIsEditing(false)}
              />
            ) : heuristics.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-xl font-semibold mb-2 text-tcof-dark">No Default Success Factors</h3>
                <p className="text-gray-600 mb-6">
                  This organisation doesn't have any default success factors defined yet.
                  {canEdit && " Click the button above to add some."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {heuristics.map((heuristic: Heuristic) => (
                    <div key={heuristic.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <h3 className="font-medium text-tcof-dark">{heuristic.successFactor}</h3>
                      
                      {heuristic.goal && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-500">Goal:</p>
                          <p className="text-sm text-gray-700">{heuristic.goal}</p>
                        </div>
                      )}
                      
                      {heuristic.metric && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-500">Metric:</p>
                          <p className="text-sm text-gray-700">{heuristic.metric}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}