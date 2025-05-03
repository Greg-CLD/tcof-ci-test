import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, Check } from 'lucide-react';
import { Stage, addTask } from '@/lib/plan-db';
import { getFactorTasks } from '../../lib/tcofData';

interface FactorTaskImportProps {
  planId: string;
  stage: Stage;
  onTasksImported: () => void;
  mappings: { heuristicId: string; factorId: string | null }[];
}

export default function FactorTaskImport({
  planId,
  stage,
  onTasksImported,
  mappings
}: FactorTaskImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Import tasks from the database
  const importTasks = () => {
    setIsLoading(true);
    
    // For each mapping with a factorId, get tasks for that factor
    const validMappings = mappings.filter(m => m.factorId);
    
    if (validMappings.length === 0) {
      toast({
        title: "No valid mappings found",
        description: "Please map at least one personal heuristic to a success factor.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // Process each mapping and add corresponding tasks
    let taskCount = 0;
    
    validMappings.forEach(mapping => {
      if (!mapping.factorId) return;
      
      const factorTasks = getFactorTasks(mapping.factorId, stage);
      
      factorTasks.forEach((taskText: string) => {
        addTask(planId, {
          text: taskText,
          stage,
          origin: 'factor',
          sourceId: mapping.factorId || undefined,
          completed: false
        }, stage);
        taskCount++;
      });
    });
    
    // Short delay for visual feedback
    setTimeout(() => {
      setIsLoading(false);
      
      if (taskCount > 0) {
        toast({
          title: "Tasks imported successfully",
          description: `${taskCount} tasks were imported for the ${stage} stage.`,
          variant: "default",
        });
        
        onTasksImported();
      } else {
        toast({
          title: "No tasks imported",
          description: "No tasks were found for the selected factors in this stage.",
          variant: "destructive",
        });
      }
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Import Tasks from Database</CardTitle>
        <CardDescription>
          Import tasks directly from the TCOF Success Factor database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
          <Database className="w-12 h-12 text-primary mb-2" />
          
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            Import tasks from the database for your selected success factors
          </p>
          
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Importing will:</p>
            <ul className="text-sm text-left space-y-1 mb-4">
              <li>• Load tasks for the factors you've mapped</li>
              <li>• Add them to your plan for the {stage} stage</li>
              <li>• Allow you to edit or delete them later</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          onClick={importTasks}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Import Tasks
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}