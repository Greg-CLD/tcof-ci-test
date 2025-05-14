import React from 'react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, HelpCircle } from 'lucide-react';
import StageTabs from './StageTabs';
import { useFactors, type FactorTask } from '@/hooks/useFactors';
import { ErrorMessage } from '@/components/ui/error-message';

interface FactorAccordionProps {
  selectedProjectId: string;
}

export default function FactorAccordion({ selectedProjectId }: FactorAccordionProps) {
  const { factors, loading, error } = useFactors();

  // Count total tasks for a factor
  const countTotalTasks = (factor: FactorTask) => {
    return (
      factor.tasks.Identification.length +
      factor.tasks.Definition.length +
      factor.tasks.Delivery.length +
      factor.tasks.Closure.length
    );
  };

  // Generate category label from factor title (e.g., "1.1 Ask Why" -> "Category 1")
  const getCategoryLabel = (factorTitle: string) => {
    const categoryNumber = factorTitle.split('.')[0];
    let categoryName = '';
    
    switch (categoryNumber) {
      case '1':
        categoryName = 'Direction';
        break;
      case '2':
        categoryName = 'History';
        break;
      case '3':
        categoryName = 'Exploration';
        break;
      case '4':
        categoryName = 'Decision-Making';
        break;
      default:
        categoryName = 'General';
    }
    
    return categoryName;
  };

  // Get badge color based on category
  const getCategoryColor = (categoryLabel: string) => {
    switch (categoryLabel) {
      case 'Direction':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'History':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Exploration':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Decision-Making':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Sort factors by ID for consistent order
  const sortedFactors = [...factors].sort((a, b) => {
    // Extract numbers from factor IDs (format: "1.1", "1.2", etc.)
    const aId = a.id.split('-')[0]; // Get the first part before any dash
    const bId = b.id.split('-')[0];
    
    // Compare first by category number, then by subcategory number
    const [aCat, aSubCat] = aId.split('.').map(Number);
    const [bCat, bSubCat] = bId.split('.').map(Number);
    
    if (aCat !== bCat) {
      return aCat - bCat;
    }
    return aSubCat - bSubCat;
  });

  if (error) {
    return (
      <ErrorMessage 
        title="Failed to load project tasks" 
        message={error} 
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
        <span className="ml-2">Loading success factors...</span>
      </div>
    );
  }

  if (factors.length === 0) {
    return (
      <Card className="p-6 text-center">
        <HelpCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-medium mb-2">No Success Factors Found</h3>
        <p className="text-gray-500">
          There are currently no success factors available. Please contact the administrator.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Success Factors</h3>
        <p className="text-gray-600 text-sm">
          These 12 TCOF success factors help ensure your project delivers the right outcome. 
          Each factor contains specific tasks across the project lifecycle.
        </p>
      </div>
      
      <Accordion type="multiple" className="space-y-4">
        {sortedFactors.map((factor) => {
          const categoryLabel = getCategoryLabel(factor.title);
          const categoryColor = getCategoryColor(categoryLabel);
          const totalTasks = countTotalTasks(factor);
          
          return (
            <AccordionItem 
              key={factor.id}
              value={factor.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:bg-gray-100 data-[state=open]:bg-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center text-left gap-2 w-full">
                  <div className="font-medium">{factor.title}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Badge variant="outline" className={categoryColor}>
                      {categoryLabel}
                    </Badge>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                      {totalTasks} tasks
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 py-3">
                <StageTabs 
                  factor={factor}
                  projectId={selectedProjectId}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}