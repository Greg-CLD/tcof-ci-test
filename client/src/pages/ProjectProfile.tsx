import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProjects, useProject, Project, CreateProjectData } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectContext } from '@/contexts/ProjectContext';
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
import { Briefcase, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { ProjectProfileView } from '@/components/ProjectProfileView';

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100, 'Project name must not exceed 100 characters'),
  description: z.string().optional(),
  sector: z.string().min(1, 'Please select a sector'),
  customSector: z.string().optional()
    .refine(val => {
      // If there's no sector or sector is not "other", customSector is optional
      // The form component will check this condition more thoroughly
      return true;
    }, {
      message: 'Please describe your sector'
    }),
  orgType: z.string().min(1, 'Please select an organization type'),
  teamSize: z.string().optional(),
  currentStage: z.string().min(1, 'Please select your current stage'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectProfileProps {
  editMode?: boolean;
}

export default function ProjectProfile({ editMode = false }: ProjectProfileProps) {
  const [location, navigate] = useLocation();
  
  // Get projectId from URL if available
  const [matchesProfile] = useRoute('/projects/:projectId/profile/edit');
  const [matchesSetup] = useRoute('/projects/:projectId/setup');
  const [, profileParams] = useRoute('/projects/:projectId/profile/edit');
  const [, setupParams] = useRoute('/projects/:projectId/setup');
  
  const { projects, isLoading: projectsLoading, createProject, updateProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    profileParams?.projectId || setupParams?.projectId || null
  );
  
  // View/Edit state - default to edit mode if on /profile/edit or /setup route, or if editMode prop is true
  const [isEditing, setIsEditing] = useState(editMode || matchesProfile || matchesSetup);
  
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const queryClient = useQueryClient();
  const { setCurrentProject, refreshProject, currentProject } = useProjectContext();
  
  // Directly fetch the specific project data using the server API
  const { project, isLoading: projectLoading } = useProject(selectedProjectId || undefined);
  
  // Track if sector is "other" to show custom sector field
  const [showCustomSector, setShowCustomSector] = useState(false);
  
  // Handler to switch to edit mode
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  // Handler to cancel edit and return to view mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    // If we have project data, reset the form with it
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        sector: project.sector || '',
        customSector: project.customSector || '',
        orgType: project.orgType || '',
        teamSize: project.teamSize || '',
        currentStage: project.currentStage || '',
      });
    }
  };
  
  // Form setup
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sector: '',
      customSector: '',
      orgType: '',
      teamSize: '',
      currentStage: '',
    },
  });

  // Check form validity on field changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (!name) return; // Skip if no field name is provided
      
      // Check if the form is valid
      const formState = form.getValues();
      let isValid = !!formState.name && formState.name.length >= 2 &&
                   !!formState.sector && 
                   !!formState.orgType &&
                   !!formState.currentStage;
      
      // Special validation for custom sector field
      if (formState.sector === 'other') {
        isValid = isValid && !!formState.customSector && formState.customSector.trim() !== '';
      }
      
      setIsFormValid(isValid);
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Redirect to home if no projects found
  useEffect(() => {
    if (!projectsLoading && projects.length === 0 && !createProject.isPending) {
      setIsRedirecting(true);
      navigate('/');
    }
  }, [projectsLoading, projects, navigate]);

  // On mount, check localStorage for projectId if one is not already set from the route
  useEffect(() => {
    // If we already have a selectedProjectId from the route, skip this step
    if (selectedProjectId) {
      console.log('Using projectId from route:', selectedProjectId);
      return;
    }
    
    // Check URL query parameters (for edit mode)
    const queryParams = new URLSearchParams(window.location.search);
    const editProjectId = queryParams.get('edit');
    
    if (editProjectId) {
      // If we have an edit parameter, set it as selected and enable edit mode
      console.log('Loading project from query parameter:', editProjectId);
      setSelectedProjectId(editProjectId);
      setIsEditing(true);
    } else {
      // Otherwise, check localStorage for a selected project
      const storedProjectId = localStorage.getItem('selectedProjectId');
      if (storedProjectId) {
        console.log('Loading project from localStorage:', storedProjectId);
        setSelectedProjectId(storedProjectId);
        // Start in view mode by default, unless editMode prop is true
        setIsEditing(editMode);
      } else {
        // If no project ID is found, redirect to dashboard
        console.log('No project ID found, redirecting to dashboard');
        setIsRedirecting(true);
        navigate('/');
      }
    }
  }, [selectedProjectId, editMode, navigate]);

  // Fill form when project data is loaded from server
  useEffect(() => {
    if (project) {
      console.log("Directly loaded project data from server:", project);
      
      // If sector is "other", show custom sector field
      if (project.sector === 'other') {
        setShowCustomSector(true);
      }
      
      // Set hasLoadedProject to true once we've loaded data
      setHasLoadedProject(true);
      
      // Reset form with server data
      form.reset({
        name: project.name,
        description: project.description || '',
        sector: project.sector || '',
        customSector: project.customSector || '',
        orgType: project.orgType || '',
        teamSize: project.teamSize || '',
        currentStage: project.currentStage || '',
      });
    }
  }, [project, form]);

  // Form submission handler
  const onSubmit = async (data: ProjectFormValues) => {
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
      const projectData: CreateProjectData = {
        name: data.name,
        description: data.description,
        sector: data.sector,
        orgType: data.orgType,
        teamSize: data.teamSize,
        currentStage: data.currentStage,
      };
      
      // Add customSector if sector is "other"
      if (data.sector === 'other' && data.customSector) {
        projectData.customSector = data.customSector;
      }
      
      // Track that we're editing to disable the form
      setIsSaved(true);
      
      if (project && selectedProjectId) {
        console.log('Updating project with data:', projectData);
        
        try {
          // Update existing project
          const updatedProject = await updateProject.mutateAsync({
            id: selectedProjectId,
            data: projectData,
          });
          
          console.log('Successfully updated project:', updatedProject);
          
          // Update the ProjectContext and cache
          if (updatedProject) {
            setCurrentProject(updatedProject);
            queryClient.setQueryData(['/api/projects', selectedProjectId], updatedProject);
            
            // Also update the project in the projects array cache
            const projects = queryClient.getQueryData<Project[]>(['/api/projects']);
            if (projects) {
              const updatedProjects = projects.map(p => 
                p.id === selectedProjectId ? updatedProject : p
              );
              queryClient.setQueryData(['/api/projects'], updatedProjects);
            }
          }
        } catch (updateError) {
          console.error('Failed to update project:', updateError);
          throw updateError;
        }
        
        // Show success message via toast
        toast({
          title: 'Project Updated',
          description: 'Your project details have been updated successfully.',
        });
        
        if (editMode || matchesProfile || matchesSetup) {
          // When in setup/edit mode, navigate back to organisation dashboard after successful update
          setTimeout(() => {
            const orgId = localStorage.getItem('selectedOrgId');
            navigate(orgId ? `/organisations/${orgId}` : '/organisations');
          }, 1000);
        } else {
          // Switch back to view mode for normal use
          setTimeout(() => {
            setIsEditing(false);
            setIsSaved(false);
          }, 500);
        }
      } else {
        // Create new project
        console.log('Creating new project with data:', projectData);
        const result = await createProject.mutateAsync(projectData);
        
        // Set as selected project
        localStorage.setItem('selectedProjectId', result.id);
        
        // Force a refetch of the project details
        await queryClient.invalidateQueries({
          queryKey: ['/api/projects', result.id]
        });
        
        // Show success message via toast
        toast({
          title: 'Project Created',
          description: 'Your new project has been created successfully.',
        });
        
        // Wait a moment to show the saved state before navigating away
        setTimeout(() => {
          if (editMode) {
            // When in setup mode, navigate back to organisation dashboard after project creation
            const orgId = localStorage.getItem('selectedOrgId');
            navigate(orgId ? `/organisations/${orgId}` : '/organisations');
          } else {
            navigate('/get-your-bearings');
          }
        }, 1500);
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

  // Check if we're working with existing project data
  const isExistingProject = !!project;
  
  // Show loading spinner while fetching project data
  if (projectLoading || (!hasLoadedProject && isExistingProject)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-tcof-teal mb-4" />
          <p className="text-tcof-dark">Loading project details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 flex items-center text-tcof-teal"
          onClick={() => {
            if (editMode || matchesProfile || matchesSetup) {
              // Back to organisation dashboard when in setup/edit mode
              const orgId = localStorage.getItem('selectedOrgId');
              navigate(orgId ? `/organisations/${orgId}` : '/organisations');
            } else {
              // Regular behavior for non-setup mode
              navigate('/get-your-bearings');
            }
          }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {editMode || matchesProfile || matchesSetup ? 'Back to Organisation' : 'Back to Get Your Bearings'}
        </Button>
        
        {/* View mode - show static summary */}
        {isExistingProject && !isEditing ? (
          <ProjectProfileView 
            project={project} 
            onEdit={handleEditClick}
            isLoading={isSaved || projectLoading}
          />
        ) : (
          /* Edit mode - show form */
          <Card className="shadow-md">
            <CardHeader className="bg-tcof-light/50">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="w-6 h-6 text-tcof-teal" />
                <CardTitle className="text-2xl text-tcof-dark">
                  {isExistingProject ? 'Edit Project Profile' : 'Create New Project'}
                </CardTitle>
              </div>
              <CardDescription>
                {isExistingProject 
                  ? 'Update your project details to help contextualize the TCOF tools and recommendations.'
                  : 'Tell us about your project to help contextualize the TCOF tools and recommendations.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Give your project a clear, identifiable name
                        </FormDescription>
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
                            placeholder="Briefly describe your project's goals and scope" 
                            className="resize-none min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          A brief description of your project's objectives and key challenges
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <Input 
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
                      name="teamSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Team Size</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="solo">Solo (1 person)</SelectItem>
                              <SelectItem value="small">Small Team (2-5 people)</SelectItem>
                              <SelectItem value="medium">Medium Team (6-15 people)</SelectItem>
                              <SelectItem value="large">Large Team (16-50 people)</SelectItem>
                              <SelectItem value="xlarge">X-Large Team (50+ people)</SelectItem>
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
                            The stage you select will help us recommend the most relevant tools and templates for your project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <CardFooter className="px-0 pt-4 flex justify-between relative">
                    {/* Loading indicator */}
                    {(projectsLoading || projectLoading) && (
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
                    
                    {/* For existing projects, show both Save and Cancel buttons */}
                    {isExistingProject ? (
                      <>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={projectsLoading || projectLoading || isSaved}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={!isFormValid || projectsLoading || projectLoading || isSaved}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      /* For new projects, just show Create button */
                      <Button 
                        type="submit" 
                        className="ml-auto"
                        disabled={!isFormValid || projectsLoading || projectLoading || isSaved}
                      >
                        Create Project
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}