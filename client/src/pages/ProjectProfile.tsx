import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/useProjects";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Save, Users, Building, Clock } from "lucide-react";

export default function ProjectProfile() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { createProject } = useProjects();

  // Form state
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [orgType, setOrgType] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryStage, setDeliveryStage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a project name",
        variant: "destructive",
      });
      return;
    }

    if (!sector) {
      toast({
        title: "Missing Information",
        description: "Please select a sector/domain",
        variant: "destructive",
      });
      return;
    }

    if (!orgType) {
      toast({
        title: "Missing Information",
        description: "Please select an organization type",
        variant: "destructive",
      });
      return;
    }

    if (!teamSize) {
      toast({
        title: "Missing Information",
        description: "Please select a team size",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryStage) {
      toast({
        title: "Missing Information",
        description: "Please select a delivery stage",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create project with all metadata
      const result = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        sector,
        orgType,
        teamSize,
        deliveryStage
      });

      // Store the project ID in localStorage for context
      localStorage.setItem('selectedProjectId', result.id);

      toast({
        title: "Project Created",
        description: "Your project has been created successfully!",
      });

      // Redirect to Get Your Bearings page
      navigate("/get-your-bearings");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-tcof-light text-tcof-dark">
      <SiteHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-tcof-dark">Project Profile</h1>
          <p className="text-lg text-gray-700 mb-8">
            Tell us about your project to help us provide the most relevant guidance and tools.
            This information will help contextualize your work with the Connected Outcomes Framework.
          </p>
          
          <Card>
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Complete the form below with your project details. Required fields are marked with an asterisk (*).
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-tcof-teal" />
                    Project Name *
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="E.g., Digital Transformation Initiative"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                
                {/* Sector/Domain */}
                <div className="space-y-2">
                  <Label htmlFor="sector" className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-tcof-teal" />
                    Sector / Domain *
                  </Label>
                  <Select value={sector} onValueChange={setSector} required>
                    <SelectTrigger id="sector">
                      <SelectValue placeholder="Select a sector or domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="nonprofit">Non-profit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Organization Type */}
                <div className="space-y-2">
                  <Label htmlFor="org-type" className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-tcof-teal" />
                    Organization Type *
                  </Label>
                  <Select value={orgType} onValueChange={setOrgType} required>
                    <SelectTrigger id="org-type">
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public Sector</SelectItem>
                      <SelectItem value="private">Private Sector</SelectItem>
                      <SelectItem value="charity">Charity/Non-profit</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Team Size */}
                <div className="space-y-2">
                  <Label htmlFor="team-size" className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-tcof-teal" />
                    Team Size *
                  </Label>
                  <Select value={teamSize} onValueChange={setTeamSize} required>
                    <SelectTrigger id="team-size">
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo (1 person)</SelectItem>
                      <SelectItem value="small">Small (2-5 people)</SelectItem>
                      <SelectItem value="medium">Medium (6-20 people)</SelectItem>
                      <SelectItem value="large">Large (20+ people)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Delivery Stage */}
                <div className="space-y-2">
                  <Label htmlFor="delivery-stage" className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-tcof-teal" />
                    Current Delivery Stage *
                  </Label>
                  <Select value={deliveryStage} onValueChange={setDeliveryStage} required>
                    <SelectTrigger id="delivery-stage">
                      <SelectValue placeholder="Select current stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identification">Identification</SelectItem>
                      <SelectItem value="definition">Definition</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="closure">Closure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-tcof-teal" />
                    Goal or Brief Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe your project goals or objectives"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end space-x-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}