/**
 * Utilities for exporting plan data to various formats
 */
import { PlanRecord, Stage, TaskItem, GoodPracticeTask } from '@/lib/plan-db';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { extractBaseTaskName } from './planHelpers';

/**
 * Exports the plan data to a PDF file
 * @param plan The plan to export
 */
export async function exportToPDF(plan: PlanRecord): Promise<void> {
  // Create a temporary container with the content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.padding = '40px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  
  // Add title
  const title = document.createElement('h1');
  title.textContent = 'Project Checklist';
  title.style.fontSize = '24px';
  title.style.marginBottom = '10px';
  title.style.color = '#16414E';
  container.appendChild(title);
  
  // Add project name and date
  const header = document.createElement('div');
  header.innerHTML = `
    <p style="margin-bottom: 20px; color: #666;">
      Plan created: ${new Date().toLocaleDateString()}
    </p>
    <hr style="margin-bottom: 30px; border: none; border-top: 1px solid #eee;" />
  `;
  container.appendChild(header);
  
  // Add summary
  const summaryHeader = document.createElement('h2');
  summaryHeader.textContent = 'Summary';
  summaryHeader.style.fontSize = '18px';
  summaryHeader.style.marginTop = '20px';
  summaryHeader.style.marginBottom = '10px';
  summaryHeader.style.color = '#16414E';
  container.appendChild(summaryHeader);
  
  // Calculate total tasks and completed tasks
  let totalTasks = 0;
  let completedTasks = 0;
  Object.values(plan.stages).forEach(stage => {
    if (stage.tasks) {
      totalTasks += stage.tasks.length;
      completedTasks += stage.tasks.filter(t => t.completed).length;
    }
    if (stage.goodPractice?.tasks) {
      totalTasks += stage.goodPractice.tasks.length;
      completedTasks += stage.goodPractice.tasks.filter(t => t.completed).length;
    }
  });
  
  const summaryText = document.createElement('p');
  summaryText.textContent = `Total progress: ${completedTasks} of ${totalTasks} tasks completed (${Math.round((completedTasks / totalTasks) * 100)}%)`;
  summaryText.style.marginBottom = '20px';
  container.appendChild(summaryText);
  
  // Add tasks by stage
  for (const [stageName, stageData] of Object.entries(plan.stages)) {
    const stageHeader = document.createElement('h3');
    stageHeader.textContent = `${stageName} Stage`;
    stageHeader.style.fontSize = '16px';
    stageHeader.style.marginTop = '30px';
    stageHeader.style.marginBottom = '10px';
    stageHeader.style.color = '#16414E';
    container.appendChild(stageHeader);
    
    // Regular tasks
    if (stageData.tasks && stageData.tasks.length > 0) {
      const tasksContainer = document.createElement('div');
      
      stageData.tasks.forEach((task, i) => {
        const taskItem = document.createElement('div');
        taskItem.style.marginBottom = '12px';
        taskItem.style.paddingLeft = '25px';
        taskItem.style.position = 'relative';
        
        // Checkbox
        const checkbox = document.createElement('div');
        checkbox.style.position = 'absolute';
        checkbox.style.left = '0';
        checkbox.style.top = '2px';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.border = '1px solid #ccc';
        checkbox.style.borderRadius = '3px';
        checkbox.style.backgroundColor = task.completed ? '#008080' : '#fff';
        checkbox.innerHTML = task.completed ? '<div style="color: white; text-align: center; line-height: 16px; font-size: 10px;">✓</div>' : '';
        taskItem.appendChild(checkbox);
        
        // Task text
        const taskText = document.createElement('div');
        taskText.style.fontSize = '14px';
        taskText.style.textDecoration = task.completed ? 'line-through' : 'none';
        taskText.style.color = task.completed ? '#888' : '#333';
        taskText.textContent = extractBaseTaskName(task.text);
        taskItem.appendChild(taskText);
        
        // Task metadata
        if (task.priority || task.dueDate) {
          const taskMeta = document.createElement('div');
          taskMeta.style.fontSize = '12px';
          taskMeta.style.color = '#666';
          taskMeta.style.marginTop = '4px';
          
          if (task.priority) {
            const priority = document.createElement('span');
            priority.textContent = `${task.priority} Priority`;
            priority.style.marginRight = '10px';
            taskMeta.appendChild(priority);
          }
          
          if (task.dueDate) {
            const dueDate = document.createElement('span');
            dueDate.textContent = `Due: ${new Date(task.dueDate).toLocaleDateString()}`;
            taskMeta.appendChild(dueDate);
          }
          
          taskItem.appendChild(taskMeta);
        }
        
        // Notes
        if (task.notes) {
          const notes = document.createElement('div');
          notes.style.fontSize = '12px';
          notes.style.color = '#666';
          notes.style.marginTop = '4px';
          notes.style.paddingLeft = '10px';
          notes.style.borderLeft = '2px solid #eee';
          notes.textContent = task.notes;
          taskItem.appendChild(notes);
        }
        
        tasksContainer.appendChild(taskItem);
      });
      
      container.appendChild(tasksContainer);
    }
    
    // Framework tasks
    if (stageData.goodPractice?.tasks && stageData.goodPractice.tasks.length > 0) {
      const frameworkHeader = document.createElement('h4');
      frameworkHeader.textContent = 'Framework Tasks';
      frameworkHeader.style.fontSize = '14px';
      frameworkHeader.style.marginTop = '15px';
      frameworkHeader.style.marginBottom = '10px';
      frameworkHeader.style.color = '#6b21a8';
      container.appendChild(frameworkHeader);
      
      const frameworkTasksContainer = document.createElement('div');
      
      stageData.goodPractice.tasks.forEach((task, i) => {
        const taskItem = document.createElement('div');
        taskItem.style.marginBottom = '12px';
        taskItem.style.paddingLeft = '25px';
        taskItem.style.position = 'relative';
        
        // Checkbox
        const checkbox = document.createElement('div');
        checkbox.style.position = 'absolute';
        checkbox.style.left = '0';
        checkbox.style.top = '2px';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.border = '1px solid #ccc';
        checkbox.style.borderRadius = '3px';
        checkbox.style.backgroundColor = task.completed ? '#6b21a8' : '#fff';
        checkbox.innerHTML = task.completed ? '<div style="color: white; text-align: center; line-height: 16px; font-size: 10px;">✓</div>' : '';
        taskItem.appendChild(checkbox);
        
        // Task text
        const taskText = document.createElement('div');
        taskText.style.fontSize = '14px';
        taskText.style.textDecoration = task.completed ? 'line-through' : 'none';
        taskText.style.color = task.completed ? '#888' : '#333';
        taskText.textContent = extractBaseTaskName(task.text);
        taskItem.appendChild(taskText);
        
        // Task metadata
        if (task.priority || task.dueDate) {
          const taskMeta = document.createElement('div');
          taskMeta.style.fontSize = '12px';
          taskMeta.style.color = '#666';
          taskMeta.style.marginTop = '4px';
          
          if (task.priority) {
            const priority = document.createElement('span');
            priority.textContent = `${task.priority} Priority`;
            priority.style.marginRight = '10px';
            taskMeta.appendChild(priority);
          }
          
          if (task.dueDate) {
            const dueDate = document.createElement('span');
            dueDate.textContent = `Due: ${new Date(task.dueDate).toLocaleDateString()}`;
            taskMeta.appendChild(dueDate);
          }
          
          taskItem.appendChild(taskMeta);
        }
        
        // Notes
        if (task.notes) {
          const notes = document.createElement('div');
          notes.style.fontSize = '12px';
          notes.style.color = '#666';
          notes.style.marginTop = '4px';
          notes.style.paddingLeft = '10px';
          notes.style.borderLeft = '2px solid #eee';
          notes.textContent = task.notes;
          taskItem.appendChild(notes);
        }
        
        frameworkTasksContainer.appendChild(taskItem);
      });
      
      container.appendChild(frameworkTasksContainer);
    }
  }
  
  // Add to document
  document.body.appendChild(container);
  
  try {
    // Generate PDF
    const pdf = new jsPDF('p', 'pt', 'a4');
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
    
    // Add more pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }
    
    // Save PDF
    pdf.save('project-checklist.pdf');
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Exports the plan data to a CSV file
 * @param plan The plan to export
 */
export function exportToCSV(plan: PlanRecord): void {
  // Header row
  const header = ['Stage', 'Task', 'Status', 'Priority', 'Due Date', 'Source', 'Notes'];
  
  // Data rows
  const rows: string[][] = [];
  
  // Iterate through stages
  for (const [stageName, stageData] of Object.entries(plan.stages)) {
    // Regular tasks
    if (stageData.tasks && stageData.tasks.length > 0) {
      stageData.tasks.forEach(task => {
        rows.push([
          stageName,
          extractBaseTaskName(task.text),
          task.completed ? 'Completed' : 'Open',
          task.priority || '',
          task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
          task.origin === 'heuristic' ? 'Personal Heuristic' : 
            task.origin === 'factor' ? 'Success Factor' : 'Custom',
          task.notes || ''
        ]);
      });
    }
    
    // Framework tasks
    if (stageData.goodPractice?.tasks && stageData.goodPractice.tasks.length > 0) {
      stageData.goodPractice.tasks.forEach(task => {
        rows.push([
          stageName,
          extractBaseTaskName(task.text),
          task.completed ? 'Completed' : 'Open',
          task.priority || '',
          task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
          'Framework',
          task.notes || ''
        ]);
      });
    }
  }
  
  // Convert to CSV
  const csvContent = [
    header.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap cell in quotes if it contains commas or quotes
        const escaped = cell.replace(/"/g, '""');
        return /[",\n]/.test(cell) ? `"${escaped}"` : cell;
      }).join(',')
    )
  ].join('\n');
  
  // Download the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'project-checklist.csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}