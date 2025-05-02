import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanRecord, Stage, TaskItem, GoodPracticeTask } from './plan-db';

/**
 * Get a timestamp formatted for filenames (YYYY-MM-DD format)
 */
function getTimestampForFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate a CSV export of the checklist tasks
 * @param plan - The plan record containing tasks
 */
export function exportCSV(plan: PlanRecord): { url: string, filename: string } {
  if (!plan) throw new Error('No plan provided');
  
  // CSV header
  let csv = 'Stage,Category,Task,Done\n';
  
  // Process each stage
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    const stageData = plan.stages[stage];
    
    // Process tasks (from success factors)
    if (stageData.tasks) {
      stageData.tasks.forEach(task => {
        let category = '';
        if (task.origin === 'factor') {
          category = 'TCOF Factor';
        } else if (task.origin === 'heuristic') {
          category = 'Personal Heuristic';
        } else if (task.origin === 'policy') {
          category = 'Policy';
        }
        
        // Escape quotes in text fields
        const escapedTask = task.text.replace(/"/g, '""');
        const done = task.completed ? 'Yes' : 'No';
        
        csv += `"${stage}","${category}","${escapedTask}","${done}"\n`;
      });
    }
    
    // Process good practice tasks
    if (stageData.goodPractice?.tasks) {
      stageData.goodPractice.tasks.forEach(task => {
        const category = `Good Practice: ${task.frameworkCode}`;
        
        // Escape quotes in text fields
        const escapedTask = task.text.replace(/"/g, '""');
        const done = task.completed ? 'Yes' : 'No';
        
        csv += `"${stage}","${category}","${escapedTask}","${done}"\n`;
      });
    }
  });
  
  // Create and prepare the file for download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const filename = `TCOF_Checklist_${getTimestampForFilename()}.csv`;
  
  return { url, filename };
}

/**
 * Download a file to the user's device
 */
export function downloadFile(filename: string, url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get Google Sheets import URL for a CSV file
 * @param csvUrl - The object URL of the CSV blob
 */
export function getGoogleSheetsImportUrl(csvUrl: string): string {
  return `https://docs.google.com/spreadsheets/d/0/import?hl=en&uploadType=manual`;
}

/**
 * Create header and footer for PDF pages
 * @param doc - The jsPDF document
 * @param pageNumber - Current page number
 * @param totalPages - Total number of pages
 */
function addHeaderAndFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  
  // Add header with logo
  try {
    // Add logo to the header (adjust size and position as needed)
    doc.addImage('/assets/confluity-logo.png', 'PNG', margin, 20, 120, 30);
  } catch (e) {
    console.warn('Could not add logo to PDF:', e);
  }
  
  // Add title to header
  doc.setFontSize(14);
  doc.setTextColor(22, 65, 78); // #16414E
  doc.text('The Connected Outcomes Framework Toolkit', pageWidth - margin - 240, 35);
  
  // Add footer with page number and date/time
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // #6b7280
  
  // Date and time in footer
  const now = new Date();
  const dateTimeStr = now.toLocaleString();
  doc.text(`Generated: ${dateTimeStr}`, margin, pageHeight - 20);
  
  // Page numbers in footer
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin - 60, pageHeight - 20);
}

/**
 * Generate a PDF export of the checklist
 * @param elementId - The ID of the element to capture in the PDF
 */
export async function exportPDF(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Create PDF with A4 dimensions
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const headerHeight = 60; // Space for header
  const footerHeight = 30; // Space for footer
  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - headerHeight - footerHeight - 2 * margin;
  
  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 1.5, // Higher resolution
      useCORS: true,
      logging: false,
      allowTaint: true
    });
    
    // Get canvas dimensions
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = availableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calculate total pages needed
    const totalPages = Math.ceil(imgHeight / availableHeight);
    
    // Process each page
    for (let i = 0; i < totalPages; i++) {
      // Add a new page after the first page
      if (i > 0) {
        pdf.addPage();
      }
      
      // Add header and footer
      addHeaderAndFooter(pdf, i + 1, totalPages);
      
      // Calculate the portion of the image to show on this page
      const sourceY = i * availableHeight * canvas.width / imgWidth;
      const sourceHeight = availableHeight * canvas.width / imgWidth;
      
      // Add the image portion for this page
      pdf.addImage({
        imageData: imgData,
        format: 'PNG',
        x: margin,
        y: margin + headerHeight,
        width: imgWidth,
        height: Math.min(availableHeight, imgHeight - i * availableHeight),
        compression: 'FAST',
        rotation: 0,
        srcX: 0,
        srcY: i * availableHeight * canvas.width / imgWidth,
        srcWidth: canvas.width,
        srcHeight: Math.min(sourceHeight, canvas.height - sourceY)
      });
    }
    
    // Save the PDF with timestamp in filename
    const timestamp = getTimestampForFilename();
    pdf.save(`TCOF_Checklist_${timestamp}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate a plaintext version of the checklist for email
 * @param plan - The plan record containing tasks
 */
export function generatePlaintextChecklist(plan: PlanRecord): string {
  if (!plan) return '';
  
  let text = 'TCOF PROJECT CHECKLIST\n\n';
  
  // Process each stage
  Object.keys(plan.stages).forEach(stageName => {
    const stage = stageName as Stage;
    const stageData = plan.stages[stage];
    
    text += `${stage.toUpperCase()} STAGE\n`;
    text += '='.repeat(stage.length + 6) + '\n\n';
    
    // Track if we added any tasks for this stage
    let tasksAddedForStage = false;
    
    // Process TCOF factor tasks
    const factorTasks = stageData.tasks?.filter(t => t.origin === 'factor') || [];
    if (factorTasks.length > 0) {
      text += 'TCOF FACTOR TASKS:\n';
      factorTasks.forEach(task => {
        const checkmark = task.completed ? '[✓]' : '[ ]';
        text += `${checkmark} ${task.text}\n`;
      });
      text += '\n';
      tasksAddedForStage = true;
    }
    
    // Process personal heuristic tasks
    const heuristicTasks = stageData.tasks?.filter(t => t.origin === 'heuristic') || [];
    if (heuristicTasks.length > 0) {
      text += 'PERSONAL HEURISTIC TASKS:\n';
      heuristicTasks.forEach(task => {
        const checkmark = task.completed ? '[✓]' : '[ ]';
        text += `${checkmark} ${task.text}\n`;
      });
      text += '\n';
      tasksAddedForStage = true;
    }
    
    // Process good practice tasks
    const gpTasks = stageData.goodPractice?.tasks || [];
    if (gpTasks.length > 0) {
      text += 'GOOD PRACTICE TASKS:\n';
      gpTasks.forEach(task => {
        const checkmark = task.completed ? '[✓]' : '[ ]';
        text += `${checkmark} ${task.text} (${task.frameworkCode})\n`;
      });
      text += '\n';
      tasksAddedForStage = true;
    }
    
    // If no tasks added, show a message
    if (!tasksAddedForStage) {
      text += 'No tasks for this stage.\n\n';
    }
    
    text += '\n';
  });
  
  text += 'Generated with The Connected Outcomes Framework Toolkit';
  text += `\nDate: ${new Date().toLocaleString()}`;
  
  return text;
}

/**
 * Open email client with checklist content
 * @param plan - The plan record containing tasks
 */
export function emailChecklist(plan: PlanRecord): void {
  if (!plan) return;
  
  const body = encodeURIComponent(generatePlaintextChecklist(plan));
  window.location.href = `mailto:?subject=TCOF%20Project%20Checklist&body=${body}`;
}