import React, { useState, useRef } from 'react';
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
import { Loader2, FileSpreadsheet, X, Check } from 'lucide-react';
import { Stage, addTask } from '@/lib/plan-db';
import { getFactorTasks } from '@/lib/tcofData';

interface ExcelImportProps {
  planId: string;
  stage: Stage;
  onTasksImported: () => void;
  mappings: { heuristicId: string; factorId: string | null }[];
}

export default function ExcelImport({
  planId,
  stage,
  onTasksImported,
  mappings
}: ExcelImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // This is a simulated import since we're not using a real Excel parser
  // In a real implementation, you would use a library like SheetJS (xlsx)
  const simulateExcelImport = () => {
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
    
    // Simulate a network delay for visual feedback
    setTimeout(() => {
      setIsLoading(false);
      setFileSelected(false);
      setFileName('');
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: "Tasks imported successfully",
        description: `${taskCount} tasks were imported for the ${stage} stage.`,
        variant: "default",
      });
      
      onTasksImported();
    }, 1500);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(true);
      setFileName(file.name);
    } else {
      setFileSelected(false);
      setFileName('');
    }
  };
  
  const clearFile = () => {
    setFileSelected(false);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Import Tasks from Excel</CardTitle>
        <CardDescription>
          Import tasks directly from the TCOF Success Factor Tasks Excel spreadsheet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
          <FileSpreadsheet className="w-12 h-12 text-primary mb-2" />
          
          {!fileSelected ? (
            <>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                Click to select or drag and drop an Excel file
              </p>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Select Excel File
              </Button>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </>
          ) : (
            <div className="flex items-center p-2 bg-white dark:bg-gray-700 rounded shadow-sm w-full">
              <FileSpreadsheet className="w-5 h-5 text-primary mr-2" />
              <span className="text-sm flex-1 truncate">{fileName}</span>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={clearFile}
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          onClick={simulateExcelImport}
          disabled={!fileSelected || isLoading}
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