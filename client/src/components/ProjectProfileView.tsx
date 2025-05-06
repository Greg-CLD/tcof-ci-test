import React from 'react';
import { Project } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Briefcase, Building2, Users, Activity, Clock, Target, Compass, Map } from 'lucide-react';
import { useProgress } from '@/contexts/ProgressContext';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useProjects } from "@/hooks/use-projects";

interface ProjectProfileViewProps {
  project: Project | undefined;
  onEdit: () => void;
  isLoading: boolean;
}

export function ProjectProfileView({ project, onEdit, isLoading }: ProjectProfileViewProps) {
  // Get progress data from the context
  const { progress } = useProgress();
  const { isSelectedProjectProfileComplete } = useProjects();

  // Handle case where project is undefined
  if (!project) {
    return (
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-tcof-light/50 pb-6">
          <CardTitle className="text-2xl text-tcof-dark">Project Not Found</CardTitle>
          <CardDescription>
            The requested project could not be loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <Button
            onClick={onEdit}
            variant="default"
            className="mt-4"
          >
            Create Project Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Helper functions for displaying formatted data
  const getSectorDisplay = () => {
    if (!project?.sector) return 'Not specified';

    switch (project.sector) {
      case 'public': return 'Public Sector';
      case 'private': return 'Private Sector';
      case 'nonprofit': return 'Non-profit / NGO';
      case 'healthcare': return 'Healthcare';
      case 'education': return 'Education';
      case 'finance': return 'Financial Services';
      case 'technology': return 'Technology';
      case 'manufacturing': return 'Manufacturing';
      case 'retail': return 'Retail';
      case 'other': return project.customSector || 'Other';
      default: return project.sector;
    }
  };

  const getOrgTypeDisplay = () => {
    if (!project?.orgType) return 'Not specified';

    switch (project.orgType) {
      case 'large_enterprise': return 'Large Enterprise (1000+ employees)';
      case 'medium_enterprise': return 'Medium Enterprise (250-999 employees)';
      case 'small_business': return 'Small Business (10-249 employees)';
      case 'micro_business': return 'Micro Business (1-9 employees)';
      case 'government': return 'Government';
      case 'education': return 'Educational Institution';
      case 'nonprofit': return 'Non-profit';
      case 'startup': return 'Startup';
      case 'other': return 'Other';
      default: return project.orgType;
    }
  };

  const getTeamSizeDisplay = () => {
    if (!project?.teamSize) return 'Not specified';

    switch (project.teamSize) {
      case 'solo': return 'Solo (1 person)';
      case 'small': return 'Small Team (2-5 people)';
      case 'medium': return 'Medium Team (6-15 people)';
      case 'large': return 'Large Team (16-50 people)';
      case 'xlarge': return 'X-Large Team (50+ people)';
      default: return project.teamSize;
    }
  };

  const getCurrentStageDisplay = () => {
    if (!project?.currentStage) return 'Not specified';

    switch (project.currentStage) {
      case 'identify': return '1. Identification';
      case 'define': return '2. Definition';
      case 'deliver': return '3. Delivery';
      case 'closure': return '4. Closure';
      default: return project.currentStage;
    }
  };

  const getStageBadgeColor = () => {
    if (!project?.currentStage) return "bg-gray-100 text-gray-800";

    switch (project.currentStage) {
      case 'identify': return "bg-blue-100 text-blue-800";
      case 'define': return "bg-purple-100 text-purple-800";
      case 'deliver': return "bg-amber-100 text-amber-800";
      case 'closure': return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-tcof-light/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-tcof-teal/10 p-3 rounded-full">
            <Briefcase className="w-6 h-6 text-tcof-teal" />
          </div>
          <div>
            <CardTitle className="text-2xl text-tcof-dark">
              Project Profile
            </CardTitle>
            <CardDescription>
              View your project details
            </CardDescription>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="text-tcof-teal border-tcof-teal hover:bg-tcof-teal/10"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-tcof-dark mb-1">{project.name}</h3>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
        </div>

        {/* Prerequisite Completion */}
        {!isSelectedProjectProfileComplete() && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Prerequisites Incomplete</AlertTitle>
            <AlertDescription>
              You must complete all three “Get Your Bearings” tools (Goal Mapping, Cynefin Orientation, TCOF Journey) before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {/* Tool Status Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge className={progress?.tools?.goalMapping?.completed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            <Target className="w-3 h-3 mr-1" />
            Goal Mapping
          </Badge>
          <Badge className={progress?.tools?.cynefinOrientation?.completed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            <Compass className="w-3 h-3 mr-1" />
            Cynefin Orientation
          </Badge>
          <Badge className={progress?.tools?.tcofJourney?.completed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            <Map className="w-3 h-3 mr-1" />
            TCOF Journey
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 p-2 rounded-full">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Sector</h4>
              <p className="text-tcof-dark font-medium">{getSectorDisplay()}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-gray-100 p-2 rounded-full">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Organization Type</h4>
              <p className="text-tcof-dark font-medium">{getOrgTypeDisplay()}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-gray-100 p-2 rounded-full">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Team Size</h4>
              <p className="text-tcof-dark font-medium">{getTeamSizeDisplay()}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-gray-100 p-2 rounded-full">
              <Activity className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Current Stage</h4>
              <div className="flex items-center mt-1">
                <Badge className={getStageBadgeColor()}>
                  {getCurrentStageDisplay()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Last updated info */}
        {project.updatedAt && (
          <div className="mt-8 text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date(project.updatedAt).toLocaleDateString()} 
          </div>
        )}
      </CardContent>
    </Card>
  );
}