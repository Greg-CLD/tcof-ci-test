import { jsPDF } from "jspdf";
import { type Outcome } from "@/components/outcomes/OutcomeSelectorModal";
import { type OutcomeProgress } from "@/components/outcomes/OutcomeProgressTracker";
import html2canvas from "html2canvas";
import { format } from "date-fns";

interface PDFExportOptions {
  projectName: string;
  outcomes: Outcome[];
  outcomeProgress: OutcomeProgress[];
}

// Create a temporary radar chart to capture as an image
const createTempRadarChart = (outcomes: Outcome[], outcomeProgress: OutcomeProgress[]): HTMLElement => {
  // Create a container for the chart
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '500px';
  container.style.height = '400px';
  document.body.appendChild(container);
  
  // Group progress by outcomeId and get the latest entry for each
  const latestProgressByOutcome = outcomeProgress.reduce((acc, progress) => {
    if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
      acc[progress.outcomeId] = progress;
    }
    return acc;
  }, {} as Record<string, OutcomeProgress>);
  
  // Create SVG element with radar chart
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '500');
  svg.setAttribute('height', '400');
  svg.setAttribute('viewBox', '0 0 500 400');
  
  // Set background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '500');
  bg.setAttribute('height', '400');
  bg.setAttribute('fill', '#ffffff');
  svg.appendChild(bg);
  
  // Add title
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  title.setAttribute('x', '250');
  title.setAttribute('y', '30');
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('font-size', '16');
  title.setAttribute('font-weight', 'bold');
  title.textContent = 'Outcome Progress Overview';
  svg.appendChild(title);
  
  // Draw radar chart if there are outcomes
  if (outcomes.length > 0) {
    const centerX = 250;
    const centerY = 200;
    const radius = 150;
    
    // Draw axes
    outcomes.forEach((outcome, i) => {
      const angle = (Math.PI * 2 * i) / outcomes.length;
      const x = centerX + radius * Math.sin(angle);
      const y = centerY - radius * Math.cos(angle);
      
      // Draw axis line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX.toString());
      line.setAttribute('y1', centerY.toString());
      line.setAttribute('x2', x.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', '#cccccc');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
      
      // Draw label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      let labelX = centerX + (radius + 20) * Math.sin(angle);
      let labelY = centerY - (radius + 20) * Math.cos(angle);
      label.setAttribute('x', labelX.toString());
      label.setAttribute('y', labelY.toString());
      label.setAttribute('font-size', '10');
      label.setAttribute('text-anchor', angle > Math.PI / 2 && angle < Math.PI * 3 / 2 ? 'end' : 'start');
      label.textContent = outcome.title.length > 15 ? outcome.title.substring(0, 15) + '...' : outcome.title;
      svg.appendChild(label);
    });
    
    // Draw concentric circles for reference
    [20, 40, 60, 80, 100].forEach(value => {
      const circleRadius = (radius * value) / 100;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', centerX.toString());
      circle.setAttribute('cy', centerY.toString());
      circle.setAttribute('r', circleRadius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#eeeeee');
      circle.setAttribute('stroke-width', '1');
      svg.appendChild(circle);
      
      // Label the circle
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (centerX + 5).toString());
      label.setAttribute('y', (centerY - circleRadius + 12).toString());
      label.setAttribute('font-size', '8');
      label.setAttribute('fill', '#999999');
      label.textContent = `${value}%`;
      svg.appendChild(label);
    });
    
    // Draw data polygons
    if (outcomes.length > 0) {
      let pathPoints = '';
      
      outcomes.forEach((outcome, i) => {
        const progress = latestProgressByOutcome[outcome.id];
        const value = progress ? progress.value : 0;
        const valueRadius = (radius * value) / 100;
        const angle = (Math.PI * 2 * i) / outcomes.length;
        const x = centerX + valueRadius * Math.sin(angle);
        const y = centerY - valueRadius * Math.cos(angle);
        
        if (i === 0) {
          pathPoints += `M ${x} ${y}`;
        } else {
          pathPoints += ` L ${x} ${y}`;
        }
      });
      
      pathPoints += ' Z'; // Close the path
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      polygon.setAttribute('d', pathPoints);
      polygon.setAttribute('fill', 'rgba(0, 128, 128, 0.6)');
      polygon.setAttribute('stroke', '#16414E');
      polygon.setAttribute('stroke-width', '2');
      svg.appendChild(polygon);
    }
  } else {
    // Display message when no outcomes
    const message = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    message.setAttribute('x', '250');
    message.setAttribute('y', '200');
    message.setAttribute('text-anchor', 'middle');
    message.setAttribute('font-size', '14');
    message.textContent = 'No outcomes selected for tracking';
    svg.appendChild(message);
  }
  
  container.appendChild(svg);
  return container;
};

export const generatePDF = async ({
  projectName,
  outcomes,
  outcomeProgress
}: PDFExportOptions): Promise<void> => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set up document metadata
  const now = new Date();
  const dateFormatted = format(now, 'yyyy-MM-dd');
  const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_outcome_progress_${dateFormatted}.pdf`;
  
  // Add project name as title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(projectName, 15, 20);
  
  // Add subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Outcome Progress Report', 15, 30);
  doc.text(`Generated on ${format(now, 'MMMM d, yyyy')} at ${format(now, 'h:mm a')}`, 15, 38);
  
  // Draw a divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 42, 195, 42);
  
  // Add radar chart visualization if there are outcomes
  if (outcomes.length > 0) {
    // Create temporary chart and capture it
    const chartContainer = createTempRadarChart(outcomes, outcomeProgress);
    
    try {
      const canvas = await html2canvas(chartContainer, {
        backgroundColor: null,
        scale: 2
      });
      
      // Add the chart image to the PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 15, 48, imgWidth, imgHeight);
      
      // Clean up
      document.body.removeChild(chartContainer);
    } catch (error) {
      console.error('Error capturing radar chart:', error);
      // Add error message to PDF
      doc.setTextColor(255, 0, 0);
      doc.text('Error generating visualization', 15, 70);
      doc.setTextColor(0, 0, 0);
      
      // Clean up
      if (chartContainer.parentNode) {
        document.body.removeChild(chartContainer);
      }
    }
  } else {
    // Add message about no outcomes
    doc.setFontSize(14);
    doc.text('No outcomes selected for tracking', 15, 70);
  }
  
  // Group progress by outcomeId and get the latest entry for each
  const latestProgressByOutcome = outcomeProgress.reduce((acc, progress) => {
    if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
      acc[progress.outcomeId] = progress;
    }
    return acc;
  }, {} as Record<string, OutcomeProgress>);
  
  // Add detailed outcome progress table
  const tableY = outcomes.length > 0 ? 150 : 80;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Outcome Progress', 15, tableY);
  
  if (outcomes.length > 0) {
    // Table headers
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Outcome', 15, tableY + 10);
    doc.text('Progress', 130, tableY + 10);
    doc.text('Last Updated', 150, tableY + 10);
    
    // Draw header underline
    doc.setDrawColor(200, 200, 200);
    doc.line(15, tableY + 12, 195, tableY + 12);
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    outcomes.forEach((outcome, index) => {
      const y = tableY + 20 + (index * 8);
      
      // Outcome title - truncate if too long
      const title = outcome.title.length > 50 
        ? outcome.title.substring(0, 47) + '...' 
        : outcome.title;
      doc.text(title, 15, y);
      
      // Progress value
      const progress = latestProgressByOutcome[outcome.id];
      const value = progress ? progress.value : 0;
      doc.text(`${value}%`, 130, y);
      
      // Last updated
      if (progress) {
        const updated = format(new Date(progress.updatedAt), 'MMM d, yyyy');
        doc.text(updated, 150, y);
      } else {
        doc.text('Not tracked', 150, y);
      }
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('No outcomes have been selected for tracking in this project.', 15, tableY + 15);
    doc.text('To track outcomes, go to the Outcome Management page and select outcomes to track.', 15, tableY + 25);
  }
  
  // Add footer with page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount}`, 
      doc.internal.pageSize.getWidth() / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: 'center' }
    );
  }
  
  // Save the PDF
  doc.save(fileName);
};