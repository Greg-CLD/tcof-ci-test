import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProject, useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Briefcase, ChevronLeft, Loader2, CheckCircle2, Pencil } from 'lucide-react';

// Helper function to get display text for sector
const getSectorDisplayText = (value: string): string => {
  const sectorMap: Record<string, string> = {
    'public': 'Public Sector',
    'private': 'Private Sector',
    'nonprofit': 'Non-profit / NGO',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'finance': 'Financial Services',
    'technology': 'Technology',
    'manufacturing': 'Manufacturing',
    'retail': 'Retail',
    'other': 'Other'
  };
  return sectorMap[value] || value;
};

// Helper function to get display text for organization type
const getOrgTypeDisplayText = (value: string): string => {
  const orgTypeMap: Record<string, string> = {
    'large_enterprise': 'Large Enterprise (1000+ employees)',
    'medium_enterprise': 'Medium Enterprise (250-999 employees)',
    'small_business': 'Small Business (10-249 employees)',
    'micro_business': 'Micro Business (1-9 employees)',
    'government': 'Government',
    'education': 'Educational Institution',
    'nonprofit': 'Non-profit',
    'startup': 'Startup',
    'other': 'Other'
  };
  return orgTypeMap[value] || value;
};

// Helper function to get display text for project stage
const getStageDisplayText = (value: string): string => {
  const stageMap: Record<string, string> = {
    'identify': '1. Identify',
    'define': '2. Definition',
    'deliver': '3. Delivery',
    'closure': '4. Closure'
  };
  return stageMap[value] || value;
};

// Basic edit form schema with only the essential fields
const basicProjectFormSchema = z.object({
  sector: z.string().min(1, 'Please select a sector'),
  customSector: z.string().optional()
    .refine(val => true, {
      message: 'Please describe your sector'
    }),
  orgType: z.string().min(1, 'Please select an organization type'),
  currentStage: z.string().min(1, 'Please select your current stage'),
});

type BasicProjectFormValues = z.infer<typeof basicProjectFormSchema>;

export default function BasicProjectEditPage() {
  const [location, navigate] = useLocation();
  
  // Get projectId and orgId from URL
  const [, projectParams] = useRoute('/projects/:projectId/edit-basic');
  const [, orgProjectParams] = useRoute('/organisations/:orgId/projects/:projectId/edit-basic');
  
  const projectId = projectParams?.projectId || orgProjectParams?.projectId;
  const orgId = orgProjectParams?.orgId;
  
  const { updateProject } = useProjects();
  const [isSaved, setIsSaved] = useState(false);
  const [showCustomSector, setShowCustomSector] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch the project data
  const { project, isLoading: projectLoading } = useProject(projectId);
  
  console.log('BasicProjectEditPage - Loading project:', { projectId, orgId, project, loading: projectLoading });
  
  // Form setup
  const form = useForm<BasicProjectFormValues>({
    resolver: zodResolver(basicProjectFormSchema),
    defaultValues: {
      sector: '',
      customSector: '',
      orgType: '',
      currentStage: '',
    },
  });
  
  // Update form defaults when project data loads
  useEffect(() => {
    if (project) {
      console.log('Setting form values from loaded project:', project);
      
      // Check if sector is "other" to show custom sector field
      setShowCustomSector(project.sector === 'other');
      
      // Reset form with server data
      form.reset({
        sector: project.sector || '',
        customSector: project.customSector || '',
        orgType: project.orgType || '',
        currentStage: project.currentStage || '',
      });
    }
  }, [project, form]);
  
  // Form submission handler
  const onSubmit = async (data: BasicProjectFormValues) => {
    if (!project || !projectId) {
      toast({
        title: 'Error',
        description: 'Project not found. Cannot save changes.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Check if sector is "other" but customSector is empty
      if (data.sector === 'other' && (!data.customSector || data.customSector.trim() === '')) {
        form.setError('customSector', {
          type: 'manual',
          message: 'Please describe your sector'
        });
        return;
      }
      
      // Create project data with proper typing
      const projectData: any = {
        // Keep existing values
        name: project.name,
        description: project.description,
        // Update with form data
        sector: data.sector,
        orgType: data.orgType,
        currentStage: data.currentStage,
        // Set isProfileComplete to true 
        isProfileComplete: true
      };
      
      // Add customSector if sector is "other"
      if (data.sector === 'other' && data.customSector) {
        projectData.customSector = data.customSector;
      }
      
      // Track that we're saving to disable the form
      setIsSaved(true);
      
      console.log('Updating project with data:', projectData);
      
      try {
        // Add detailed logging before making the request
        console.log('Updating project with ID:', projectId);
        console.log('Update payload:', JSON.stringify(projectData, null, 2));
        
        // Update existing project
        const updatedProject = await updateProject.mutateAsync({
          id: projectId,
          data: projectData,
        });
        
        console.log('Successfully updated project:', updatedProject);
        
        // Update the cache
        queryClient.setQueryData(['/api/projects', projectId], updatedProject);
        
        // Also update the project in the projects array cache
        const projects = queryClient.getQueryData<any[]>(['/api/projects']);
        if (projects) {
          const updatedProjects = projects.map(p => 
            p.id === projectId ? updatedProject : p
          );
          queryClient.setQueryData(['/api/projects'], updatedProjects);
        }
        
        // Invalidate organisation-specific projects if we have an orgId
        if (orgId) {
          queryClient.invalidateQueries({
            queryKey: [`/api/organisations/${orgId}/projects`]
          });
        }
        
        // Show success message via toast
        toast({
          title: 'Project Updated',
          description: 'Your project details have been updated successfully.',
        });
        
        // Exit edit mode after successful save
        setIsEditMode(false);
        
        // Navigate back after successful update (only if we're not staying in view mode)
        // setTimeout(() => {
        //   if (orgId) {
        //     navigate(`/organisations/${orgId}`);
        //   } else {
        //     navigate('/organisations');
        //   }
        // }, 1000);
      } catch (updateError) {
        console.error('Failed to update project:', updateError);
        // Try to extract more details about the error
        if (updateError instanceof Error) {
          console.error('Error message:', updateError.message);
          
          // If it's a response with details
          if ('response' in updateError) {
            const responseError = updateError as any;
            console.error('Response status:', responseError.response?.status);
            console.error('Response data:', responseError.response?.data);
          }
        }
        
        setIsSaved(false);
        throw updateError;
      }
    } catch (error) {
      console.error('Error saving project:', error);
      
      // Reset saved state since we had an error
      setIsSaved(false);
      
      // Show error message
      toast({
        title: 'Error',
        description: 'There was a problem saving your project. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Show loading spinner while fetching project data
  if (projectLoading || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-tcof-teal mb-4" />
          <p className="text-tcof-dark">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Determine if we have completed project details
  const hasProjectDetails = project.sector && project.orgType && project.currentStage;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 flex items-center text-tcof-teal"
          onClick={() => {
            // Back to organisation dashboard
            if (orgId) {
              navigate(`/organisations/${orgId}`);
            } else if (project?.organisationId) {
              navigate(`/organisations/${project.organisationId}`);
            } else {
              navigate('/organisations');
            }
          }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Organisation
        </Button>
        
        <Card className="shadow-md">
          <CardHeader className="bg-tcof-light/50">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-tcof-teal" />
                <CardTitle className="text-2xl text-tcof-dark">
                  {isEditMode ? "Edit" : "View"} Project Details: {project.name}
                </CardTitle>
              </div>
              {!isEditMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-tcof-teal hover:text-tcof-teal-dark" 
                  onClick={() => setIsEditMode(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <CardDescription>
              {isEditMode 
                ? "Update essential information about your project" 
                : "Essential information about your project"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {isEditMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Sector*</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setShowCustomSector(value === "other");
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project sector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">Public Sector</SelectItem>
                              <SelectItem value="private">Private Sector</SelectItem>
                              <SelectItem value="nonprofit">Non-profit / NGO</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="finance">Financial Services</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                              <SelectItem value="manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {showCustomSector && (
                      <FormField
                        control={form.control}
                        name="customSector"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please describe your sector*</FormLabel>
                            <FormControl>
                              <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Enter your specific sector" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="orgType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Type*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select organization type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="large_enterprise">Large Enterprise (1000+ employees)</SelectItem>
                              <SelectItem value="medium_enterprise">Medium Enterprise (250-999 employees)</SelectItem>
                              <SelectItem value="small_business">Small Business (10-249 employees)</SelectItem>
                              <SelectItem value="micro_business">Micro Business (1-9 employees)</SelectItem>
                              <SelectItem value="government">Government</SelectItem>
                              <SelectItem value="education">Educational Institution</SelectItem>
                              <SelectItem value="nonprofit">Non-profit</SelectItem>
                              <SelectItem value="startup">Startup</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currentStage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Which stage are you currently in?*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select current stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="identify">1. Identify</SelectItem>
                              <SelectItem value="define">2. Definition</SelectItem>
                              <SelectItem value="deliver">3. Delivery</SelectItem>
                              <SelectItem value="closure">4. Closure</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The stage you select will help us recommend the most relevant tools
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <CardFooter className="px-0 pt-4 flex justify-between relative">
                    {/* Loading indicator */}
                    {projectLoading && (
                      <div className="absolute top-0 left-0 right-0 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-tcof-teal" />
                      </div>
                    )}
                    
                    {/* Show saved state indicator when saved */}
                    {isSaved && (
                      <div className="absolute right-0 -top-8 flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-md animate-fadeIn">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">Saved!</span>
                      </div>
                    )}
                    
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditMode(false)}
                      disabled={isSaved}
                    >
                      Cancel
                    </Button>
                    
                    <Button 
                      type="submit"
                      disabled={isSaved || updateProject.isPending}
                    >
                      {updateProject.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : isSaved ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            ) : (
              // View-only mode - static project details
              <div className="space-y-6">
                {hasProjectDetails ? (
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-tcof-dark">Project Sector</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100">
                        {project.sector === 'other' && project.customSector 
                          ? `${getSectorDisplayText(project.sector)} - ${project.customSector}` 
                          : getSectorDisplayText(project.sector || '')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-tcof-dark">Organization Type</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100">
                        {getOrgTypeDisplayText(project.orgType || '')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-tcof-dark">Project Stage</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100">
                        {getStageDisplayText(project.currentStage || '')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        The stage you select will help us recommend the most relevant tools
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">No project details have been added yet.</p>
                    <Button 
                      variant="default" 
                      onClick={() => setIsEditMode(true)}
                    >
                      Add Project Details
                    </Button>
                  </div>
                )}

                <CardFooter className="px-0 pt-6 flex justify-end">
                  <Button 
                    variant="default"
                    onClick={() => {
                      if (orgId) {
                        navigate(`/organisations/${orgId}`);
                      } else if (project?.organisationId) {
                        navigate(`/organisations/${project.organisationId}`);
                      } else {
                        navigate('/organisations');
                      }
                    }}
                  >
                    Back to Organisation
                  </Button>
                </CardFooter>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}