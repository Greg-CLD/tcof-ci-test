import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProjects, Project } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Briefcase, ChevronLeft } from 'lucide-react';

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  sector: z.string().optional(),
  orgType: z.string().optional(),
  teamSize: z.string().optional(),
  deliveryStage: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectProfile() {
  const [location, navigate] = useLocation();
  const { projects, isLoading, createProject, updateProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form setup
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sector: '',
      orgType: '',
      teamSize: '',
      deliveryStage: '',
    },
  });

  // On mount, check if there's a projectId in localStorage
  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setSelectedProjectId(storedProjectId);
      setIsEditing(true);
    }
  }, []);

  // Fill form when editing and projects are loaded
  useEffect(() => {
    if (selectedProjectId && projects.length > 0 && isEditing) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        form.reset({
          name: project.name,
          description: project.description || '',
          sector: project.sector || '',
          orgType: project.orgType || '',
          teamSize: project.teamSize || '',
          deliveryStage: project.deliveryStage || '',
        });
      }
    }
  }, [selectedProjectId, projects, isEditing, form]);

  // Form submission handler
  const onSubmit = async (data: ProjectFormValues) => {
    try {
      if (isEditing && selectedProjectId) {
        // Update existing project
        const result = await updateProject.mutateAsync({
          id: selectedProjectId,
          data: {
            name: data.name,
            description: data.description,
            sector: data.sector,
            orgType: data.orgType,
            teamSize: data.teamSize,
            deliveryStage: data.deliveryStage,
          },
        });
        
        toast({
          title: 'Project Updated',
          description: 'Your project details have been updated successfully.',
        });
        
        // Navigate to home or appropriate next page
        navigate('/get-your-bearings');
      } else {
        // Create new project
        const result = await createProject.mutateAsync({
          name: data.name,
          description: data.description,
          sector: data.sector,
          orgType: data.orgType,
          teamSize: data.teamSize,
          deliveryStage: data.deliveryStage,
        });
        
        // Set as selected project
        localStorage.setItem('selectedProjectId', result.id);
        
        toast({
          title: 'Project Created',
          description: 'Your new project has been created successfully.',
        });
        
        // Navigate to home or appropriate next page
        navigate('/get-your-bearings');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'There was a problem saving your project. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4 flex items-center text-tcof-teal"
          onClick={() => navigate('/get-your-bearings')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Get Your Bearings
        </Button>
        
        <Card className="shadow-md">
          <CardHeader className="bg-tcof-light/50">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-6 h-6 text-tcof-teal" />
              <CardTitle className="text-2xl text-tcof-dark">
                {isEditing ? 'Edit Project Profile' : 'Create New Project'}
              </CardTitle>
            </div>
            <CardDescription>
              {isEditing 
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
                        <FormLabel>Project Sector</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
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
                  
                  <FormField
                    control={form.control}
                    name="orgType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Type</FormLabel>
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
                    name="deliveryStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Stage</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select delivery stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="concept">Concept / Idea Stage</SelectItem>
                            <SelectItem value="planning">Planning Phase</SelectItem>
                            <SelectItem value="requirements">Requirements Gathering</SelectItem>
                            <SelectItem value="design">Design Phase</SelectItem>
                            <SelectItem value="development">Development / Implementation</SelectItem>
                            <SelectItem value="testing">Testing / QA</SelectItem>
                            <SelectItem value="deployment">Deployment / Go-Live</SelectItem>
                            <SelectItem value="postlaunch">Post-Launch / Maintenance</SelectItem>
                            <SelectItem value="retrospective">Retrospective / Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <CardFooter className="px-0 pt-4 flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate('/get-your-bearings')}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                    disabled={isLoading || createProject.isPending || updateProject.isPending}
                  >
                    {isEditing ? 'Update Project' : 'Create Project'}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}