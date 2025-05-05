import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Building, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";

interface Organisation {
  id: string;
  name: string;
  description: string | null;
  role: 'owner' | 'admin' | 'member';
}

export default function OrganisationListPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    description: ""
  });

  // Fetch organizations for the current user
  const { data: organisations = [], isLoading, error } = useQuery({
    queryKey: ["/api/organisations"], 
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/organisations");
      if (!res.ok) {
        throw new Error("Failed to fetch organisations");
      }
      return res.json();
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

  // Handle API error
  if (error) {
    toast({
      title: "Error",
      description: "Failed to fetch organisations. Please try again.",
      variant: "destructive"
    });
  }

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
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>
                    <Link href={`/organisations/${org.id}`} className="hover:text-tcof-primary transition-colors">
                      {org.name}
                    </Link>
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
              <CardFooter className="flex justify-end">
                <Button variant="outline" asChild>
                  <Link href={`/organisations/${org.id}`}>
                    View
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}