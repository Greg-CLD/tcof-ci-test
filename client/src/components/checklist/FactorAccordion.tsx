import React, { useState, useEffect } from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import StageTabs from './StageTabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

interface FactorAccordionProps {
  selectedProjectId: string;
}

export default function FactorAccordion({ selectedProjectId }: FactorAccordionProps) {
  const [factors, setFactors] = useState<FactorTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadFactors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest('GET', '/api/admin/success-factors');
      if (!response.ok) {
        throw new Error('Failed to load success factors');
      }
      
      const data = await response.json();
      console.log(`Loaded ${data.length} success factors`);
      setFactors(data);
    } catch (error) {
      console.error('Error loading success factors:', error);
      setError('Failed to load success factors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load factors on component mount
  useEffect(() => {
    loadFactors();
  }, []);

  // Show loading skeleton during initial load
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(4).fill(0).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Show error message if loading failed
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex justify-between items-center">
          <span>{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadFactors}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // If no factors were found
  if (factors.length === 0) {
    return (
      <Alert className="my-4">
        <AlertDescription>
          No success factors found. Please contact an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // Group factors by their categories
  const factorsByCategory: Record<string, FactorTask[]> = {};
  factors.forEach(factor => {
    const categoryId = factor.id.split('.')[0];
    if (!factorsByCategory[categoryId]) {
      factorsByCategory[categoryId] = [];
    }
    factorsByCategory[categoryId].push(factor);
  });

  // Get category names
  const getCategoryName = (categoryId: string) => {
    switch (categoryId) {
      case '1': return 'Leadership';
      case '2': return 'Best Practice';
      case '3': return 'Agility';
      case '4': return 'Optimism Control';
      default: return `Category ${categoryId}`;
    }
  };

  // Render accordion for all factors
  return (
    <Accordion type="single" collapsible className="space-y-4">
      {Object.keys(factorsByCategory).sort().map(categoryId => (
        <div key={categoryId} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">{getCategoryName(categoryId)}</h3>
          
          <Accordion type="multiple" className="space-y-2">
            {factorsByCategory[categoryId].map(factor => (
              <AccordionItem key={factor.id} value={factor.id} className="border rounded-md overflow-hidden">
                <AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
                  <div className="flex items-center text-left">
                    <span className="bg-primary/10 text-primary text-xs rounded-md px-2 py-1 mr-2 font-mono">
                      {factor.id}
                    </span>
                    <span>{factor.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <StageTabs
                    factor={factor}
                    projectId={selectedProjectId}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </Accordion>
  );
}