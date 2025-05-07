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
import { Textarea } from '@/components/ui/textarea';
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

// Helper function to get display text for industry (SIC codes)
const getIndustryDisplayText = (value: string): string => {
  const industryMap: Record<string, string> = {
    'A': 'A – Agriculture, Forestry and Fishing',
    'B': 'B – Mining and Quarrying',
    'C': 'C – Manufacturing',
    'D': 'D – Electricity, Gas, Steam and Air Conditioning Supply',
    'E': 'E – Water Supply; Sewerage; Waste Management and Remediation Activities',
    'F': 'F – Construction',
    'G': 'G – Wholesale and Retail Trade; Repair of Motor Vehicles and Motorcycles',
    'H': 'H – Transport and Storage',
    'I': 'I – Accommodation and Food Service Activities',
    'J': 'J – Information and Communication',
    'K': 'K – Financial and Insurance Activities',
    'L': 'L – Real Estate Activities',
    'M': 'M – Professional, Scientific and Technical Activities',
    'N': 'N – Administrative and Support Service Activities',
    'O': 'O – Public Administration and Defence; Compulsory Social Security',
    'P': 'P – Education',
    'Q': 'Q – Human Health and Social Work Activities',
    'R': 'R – Arts, Entertainment and Recreation',
    'S': 'S – Other Service Activities',
    'T': 'T – Activities of Households as Employers',
    'U': 'U – Activities of Extraterritorial Organisations and Bodies'
  };
  return industryMap[value] || value;
};

// Helper function to get display text for organisation size
const getOrgSizeDisplayText = (value: string): string => {
  const sizeMap: Record<string, string> = {
    'micro': 'Micro (1-9 employees)',
    'small': 'Small (10-49 employees)',
    'medium': 'Medium (50-249 employees)',
    'large': 'Large (250+ employees)'
  };
  return sizeMap[value] || value;
};

// Basic edit form schema with only the essential fields
const basicProjectFormSchema = z.object({
  sector: z.string().min(1, 'Please select a sector'),
  customSector: z.string().optional()
    .refine(val => true, {
      message: 'Please describe your sector'
    }),
  industry: z.string().min(1, 'Please select an industry'),
  organisationSize: z.string().min(1, 'Please select an organization size'),
  description: z.string().optional(),
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
      industry: '',
      organisationSize: '',
      description: '',
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
        industry: project.industry || '',
        organisationSize: project.organisationSize || '',
        description: project.description || '',
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
        // Update with form data
        sector: data.sector,
        industry: data.industry,
        organisationSize: data.organisationSize,
        description: data.description,
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
  const hasProjectDetails = project.sector && project.industry && project.organisationSize;

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
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry (SIC code)*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A">A – Agriculture, Forestry and Fishing</SelectItem>
                              <SelectItem value="B">B – Mining and Quarrying</SelectItem>
                              <SelectItem value="C">C – Manufacturing</SelectItem>
                              <SelectItem value="D">D – Electricity, Gas, Steam and Air Conditioning Supply</SelectItem>
                              <SelectItem value="E">E – Water Supply; Sewerage; Waste Management</SelectItem>
                              <SelectItem value="F">F – Construction</SelectItem>
                              <SelectItem value="G">G – Wholesale and Retail Trade</SelectItem>
                              <SelectItem value="H">H – Transport and Storage</SelectItem>
                              <SelectItem value="I">I – Accommodation and Food Service Activities</SelectItem>
                              <SelectItem value="J">J – Information and Communication</SelectItem>
                              <SelectItem value="K">K – Financial and Insurance Activities</SelectItem>
                              <SelectItem value="L">L – Real Estate Activities</SelectItem>
                              <SelectItem value="M">M – Professional, Scientific and Technical Activities</SelectItem>
                              <SelectItem value="N">N – Administrative and Support Service Activities</SelectItem>
                              <SelectItem value="O">O – Public Administration and Defence</SelectItem>
                              <SelectItem value="P">P – Education</SelectItem>
                              <SelectItem value="Q">Q – Human Health and Social Work Activities</SelectItem>
                              <SelectItem value="R">R – Arts, Entertainment and Recreation</SelectItem>
                              <SelectItem value="S">S – Other Service Activities</SelectItem>
                              <SelectItem value="T">T – Activities of Households as Employers</SelectItem>
                              <SelectItem value="U">U – Activities of Extraterritorial Organisations</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="organisationSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organisation Size*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select organisation size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="micro">Micro (1-9 employees)</SelectItem>
                              <SelectItem value="small">Small (10-49 employees)</SelectItem>
                              <SelectItem value="medium">Medium (50-249 employees)</SelectItem>
                              <SelectItem value="large">Large (250+ employees)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide a brief description of your project"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
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
                      <h3 className="text-lg font-medium text-tcof-dark">Industry (SIC code)</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100">
                        {getIndustryDisplayText(project.industry || '')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-tcof-dark">Organisation Size</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100">
                        {getOrgSizeDisplayText(project.organisationSize || '')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-tcof-dark">Project Description</h3>
                      <p className="text-slate-700 rounded-md py-2 bg-slate-50 px-3 border border-slate-100 whitespace-pre-wrap">
                        {project.description || 'No description provided'}
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