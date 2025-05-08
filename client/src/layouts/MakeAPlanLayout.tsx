import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from 'wouter';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ArrowLeft } from 'lucide-react';

interface MakeAPlanLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  currentStep?: number;
  block: number;
}

const MakeAPlanLayout: React.FC<MakeAPlanLayoutProps> = ({
  children,
  title,
  description,
  currentStep,
  block,
}) => {
  const { projectId } = useParams();
  const [location] = useLocation();
  const { currentProject } = useProjectContext();
  
  const blockNames = [
    'Discover',
    'Design',
    'Deliver'
  ];
  
  const blockSteps = [
    ['Success Factor Rating', 'Personal Heuristics'], // Block 1
    ['Link Heuristics to Factors', 'Tasks for Unlinked Heuristics'], // Block 2
    ['Delivery Approach', 'Project Tasks'] // Block 3
  ];
  
  const currentBlockName = blockNames[block - 1] || '';
  const currentBlockSteps = blockSteps[block - 1] || [];
  
  // Get project path for back button
  const getProjectPath = () => {
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId && projectId) {
      return `/organisations/${orgId}/projects/${projectId}`;
    } else if (projectId) {
      return `/projects/${projectId}`;
    }
    return '/all-projects';
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/">
              <BreadcrumbLink>Home</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href="/make-a-plan">
              <BreadcrumbLink>Make a Plan</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/make-a-plan/${projectId}/block-${block}`}>
              <BreadcrumbLink>Block {block}: {currentBlockName}</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>
          {currentStep && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Step {currentStep}: {currentBlockSteps[currentStep - 1]}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Back button */}
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/make-a-plan/${projectId}/block-${block}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Block {block}
          </Link>
        </Button>
      </div>
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
        
        {currentProject && (
          <div className="mt-2 text-sm text-muted-foreground">
            Project: <span className="font-medium text-foreground">{currentProject.name}</span>
          </div>
        )}
      </div>
      
      {/* Step Indicators */}
      {currentStep && (
        <div className="flex mb-6">
          {currentBlockSteps.map((stepName, index) => (
            <Link 
              key={index} 
              href={`/make-a-plan/${projectId}/block-${block}/step-${index + 1}`}
            >
              <div 
                className={cn(
                  "flex items-center mr-4 cursor-pointer",
                  index + 1 === currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div 
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full mr-2",
                    index + 1 === currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <span className={cn(
                  index + 1 === currentStep ? "font-medium" : ""
                )}>
                  {stepName}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Main Content */}
      {children}
    </div>
  );
};

export default MakeAPlanLayout;