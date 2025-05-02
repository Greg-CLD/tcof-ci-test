import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanRecord, Stage, TaskItem, GoodPracticeTask } from './plan-db';

/**
 * Generate a CSV export of the checklist tasks
 * @param plan - The plan record containing tasks
 */
export function exportCSV(plan: PlanRecord): void {
  if (!plan) return;
  
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
  
  // Create and download the CSV file
  downloadFile('checklist.csv', csv, 'text/csv');
}

/**
 * Download a file to the user's device
 */
function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const availableWidth = pageWidth - 2 * margin;
  
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
    
    // Add title to the first page
    pdf.setFontSize(18);
    pdf.setTextColor(22, 65, 78); // #16414E
    pdf.text('TCOF Project Checklist', margin, margin);
    
    // Add date
    pdf.setFontSize(12);
    pdf.setTextColor(107, 114, 128); // #6b7280
    const date = new Date().toLocaleDateString();
    pdf.text(`Generated on ${date}`, margin, margin + 20);
    
    // Add the image across multiple pages if needed
    let heightLeft = imgHeight;
    let position = 0;
    let pageOffset = margin + 50; // Space for the title and date
    
    // First page
    pdf.addImage(imgData, 'PNG', margin, pageOffset, imgWidth, imgHeight);
    heightLeft -= (pageHeight - pageOffset);
    position = heightLeft;
    
    // Additional pages if needed
    while (heightLeft > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, -position + margin, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 2 * margin);
      position += (pageHeight - 2 * margin);
    }
    
    // Save the PDF
    pdf.save('tcof_checklist.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
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