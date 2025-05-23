import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Building, Plus, Loader2, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Organisation {
  id: string;
  name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
}

export default function OrganisationListPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organisation | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    description: ""
  });

  // Fetch organizations for the current user
  const { data: organisations = [], isLoading, error } = useQuery({
    queryKey: ["/api/organisations"], 
    queryFn: async () => {
      console.log("Fetching organisations from API...");
      const res = await apiRequest("GET", "/api/organisations");
      if (!res.ok) {
        console.error("Failed to fetch organisations:", res.status, res.statusText);
        throw new Error("Failed to fetch organisations");
      }
      const data = await res.json();
      console.log("ORG QUERY", data);
      return data;
    }
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new organisation
  const handleCreateOrganisation = async () => {
    if (!formState.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Organisation name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/organisations", {
        name: formState.name.trim(),
        description: formState.description.trim() || null
      });

      if (!res.ok) {
        throw new Error("Failed to create organisation");
      }

      // Reset form and close dialog
      setFormState({ name: "", description: "" });
      setIsCreateDialogOpen(false);

      // Refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });

      toast({
        title: "Success",
        description: "Organisation created successfully",
      });
    } catch (err) {
      console.error("Error creating organisation:", err);
      toast({
        title: "Error",
        description: "Failed to create organisation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete organisation mutation
  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const res = await apiRequest("DELETE", `/api/organisations/${orgId}`);
      if (!res.ok) {
        throw new Error("Failed to delete organisation");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the organisations query to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
      
      toast({
        title: "Success",
        description: "Organisation deleted successfully",
      });
      
      setOrgToDelete(null);
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting organisation:", error);
      toast({
        title: "Error",
        description: "Failed to delete organisation. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (orgToDelete) {
      deleteMutation.mutate(orgToDelete.id);
    }
  };

  // Prepare org for deletion and open confirm dialog
  const handleDeleteClick = (org: Organisation) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  };

  // Handle API error with useEffect to avoid infinite re-renders
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch organisations. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-tcof-dark">Your Organisations</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organisation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organisation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formState.name} 
                  onChange={handleInputChange} 
                  placeholder="Enter organisation name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formState.description} 
                  onChange={handleInputChange} 
                  placeholder="Enter organisation description" 
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateOrganisation}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-tcof-primary" />
            </div>
          ) : organisations.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Building className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2 text-tcof-dark">No Organisations Found</h2>
              <p className="text-gray-600 mb-6">You don't have any organisations yet. Create one to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Organisation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {organisations.map((org: Organisation) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow bg-[#008080] text-[#fff5e7]">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle 
                    className="hover:text-tcof-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/organisations/${org.id}`)}
                  >
                    {org.name}
                  </CardTitle>
                  <Badge variant={org.role === 'owner' ? "default" : "outline"}>
                    {org.role}
                  </Badge>
                </div>
                {org.description && (
                  <CardDescription>{org.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {/* Additional content could go here, such as member count or stats */}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => handleDeleteClick(org)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/organisations/${org.id}`)}
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  View
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organisation</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this organisation? This removes all its projects and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}