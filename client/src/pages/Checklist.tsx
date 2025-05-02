import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Info, FileSpreadsheet, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SummaryBar from '@/components/checklist/SummaryBar';
import StageAccordion from '@/components/checklist/StageAccordion';
import { useToast } from '@/hooks/use-toast';
import { PlanRecord, loadPlan } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';
import { exportCSV, exportPDF, emailChecklist, downloadFile, getGoogleSheetsImportUrl } from '@/lib/exportUtils';
import styles from '@/lib/styles/checklist.module.css';

export default function Checklist() {
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [csvExportUrl, setCsvExportUrl] = useState<string | null>(null);
  const [csvFilename, setCsvFilename] = useState<string>('');
  const [showCsvOptions, setShowCsvOptions] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Load the plan data
  useEffect(() => {
    const loadPlanData = async () => {
      try {
        const id = getLatestPlanId();
        if (!id) {
          // No plan found, redirect to make-a-plan
          setLocation('/make-a-plan');
          return;
        }
        
        const loadedPlan = await loadPlan(id);
        if (!loadedPlan) {
          // Plan ID exists but plan not found
          setLocation('/make-a-plan');
          return;
        }
        
        setPlan(loadedPlan);
      } catch (error) {
        console.error('Error loading plan:', error);
        toast({
          title: 'Error loading plan',
          description: 'There was a problem loading your plan. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlanData();
  }, [setLocation, toast]);
  
  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (csvExportUrl) {
        URL.revokeObjectURL(csvExportUrl);
      }
    };
  }, [csvExportUrl]);
  
  // Handle plan updates from child components
  const handlePlanUpdate = (updatedPlan: PlanRecord) => {
    setPlan(updatedPlan);
  };
  
  // Handle CSV export
  const handleExportCSV = () => {
    if (!plan) return;
    
    try {
      // Clean up previous URLs
      if (csvExportUrl) {
        URL.revokeObjectURL(csvExportUrl);
      }
      
      // Generate the CSV and get the URL
      const { url, filename } = exportCSV(plan);
      setCsvExportUrl(url);
      setCsvFilename(filename);
      setShowCsvOptions(true);
      
      toast({
        title: 'CSV export ready',
        description: 'Choose how you want to use your CSV export.',
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: 'Export failed',
        description: 'There was a problem exporting your checklist.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle CSV download
  const handleDownloadCSV = () => {
    if (!csvExportUrl || !csvFilename) return;
    
    try {
      downloadFile(csvFilename, csvExportUrl);
      toast({
        title: 'CSV download started',
        description: 'Your checklist CSV is being downloaded.',
      });
      setShowCsvOptions(false);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: 'Download failed',
        description: 'There was a problem downloading your CSV file.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle open in Google Sheets
  const handleOpenInGoogleSheets = () => {
    if (!csvExportUrl) return;
    
    try {
      // First download locally
      downloadFile(csvFilename, csvExportUrl);
      
      // Then open Google Sheets import page
      window.open(getGoogleSheetsImportUrl(csvExportUrl), '_blank');
      
      toast({
        title: 'Google Sheets import started',
        description: 'Your CSV has been downloaded and Google Sheets import page opened.',
      });
      setShowCsvOptions(false);
    } catch (error) {
      console.error('Error opening Google Sheets:', error);
      toast({
        title: 'Google Sheets import failed',
        description: 'There was a problem opening Google Sheets.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      await exportPDF('checklist-content');
      toast({
        title: 'PDF export successful',
        description: 'Your checklist has been exported to PDF format.',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Export failed',
        description: 'There was a problem exporting your checklist.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle email
  const handleEmailChecklist = () => {
    if (!plan) return;
    
    try {
      emailChecklist(plan);
    } catch (error) {
      console.error('Error opening email client:', error);
      toast({
        title: 'Email failed',
        description: 'There was a problem opening your email client.',
        variant: 'destructive',
      });
    }
  };
  
  // Check if all tasks are completed
  const allTasksCompleted = () => {
    if (!plan) return false;
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.values(plan.stages).forEach(stage => {
      // Count regular tasks
      (stage.tasks || []).forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
      
      // Count good practice tasks
      (stage.goodPractice?.tasks || []).forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
    });
    
    return totalTasks > 0 && completedTasks === totalTasks;
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-tcof-light">
        <SiteHeader />
        <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-tcof-teal" />
            <h2 className="mt-4 text-xl font-semibold text-tcof-dark">Loading your checklist...</h2>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
  
  // Render no plan state
  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col bg-tcof-light">
        <SiteHeader />
        <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-tcof-dark mb-4">No Plan Found</h2>
            <p className="text-gray-600 mb-6">You need to create a plan first before viewing your checklist.</p>
            <Button
              onClick={() => setLocation('/make-a-plan')}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              Create a Plan
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-tcof-light">
      <SiteHeader />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div id="checklist-content" className="max-w-4xl mx-auto">
          <div className={styles.pageTitle}>
            <h1 className={styles.pageTitleText}>
              {allTasksCompleted() && '🎉 '} Your Project Checklist
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-2 h-5 w-5 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tick items as you complete them. Changes save automatically.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <SummaryBar plan={plan} />
          
          {/* Stage accordions */}
          <StageAccordion
            stage="Identification"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Definition"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Delivery"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          <StageAccordion
            stage="Closure"
            plan={plan}
            onPlanUpdate={handlePlanUpdate}
          />
          
          {/* Export options */}
          <div className={styles.exportBar}>
            {!showCsvOptions ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button
                  onClick={handleEmailChecklist}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email via Mail App
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenInGoogleSheets}
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Open in Google Sheets
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCsvOptions(false)}
                  className="border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}