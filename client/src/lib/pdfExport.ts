import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { type Outcome } from '../components/outcomes/OutcomeSelectorModal';
import { type OutcomeProgress } from '../components/outcomes/OutcomeProgressTracker';

interface OutcomeWithProgress {
  outcome: Outcome;
  progress: number;
  lastUpdated: string | null;
}

/**
 * Exports outcome data as a PDF document
 * 
 * @param projectName - The name of the project
 * @param svgElement - The SVG element containing the radar chart
 * @param outcomes - Array of outcomes with their progress values
 * @param progressData - Array of outcome progress records
 * @returns Promise resolving to true if export is successful
 */
export async function exportOutcomesToPDF(
  projectName: string,
  svgElement: SVGSVGElement,
  outcomes: Outcome[],
  progressData: OutcomeProgress[]
): Promise<boolean> {
  try {
    // Create a new PDF document in landscape orientation
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Set up header with project name and timestamp
    const now = new Date();
    const timestamp = format(now, "yyyy-MM-dd HH:mm");
    const fileTimestamp = format(now, "yyyyMMdd_HHmm");
    
    // Add header
    pdf.setFontSize(18);
    pdf.setTextColor(22, 65, 78); // #16414E
    pdf.text(projectName, 14, 15);
    
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${timestamp}`, pageWidth - 60, 15);
    
    // Prepare the SVG chart
    try {
      // Create a temporary container to hold the SVG for html2canvas
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(svgElement.cloneNode(true));
      document.body.appendChild(tempContainer);
      
      // Convert the SVG to a canvas using html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher scale for better quality
        backgroundColor: null, // Transparent background
        logging: false,
        useCORS: true
      });
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      // Convert canvas to an image and add to PDF
      const chartImgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit half the page width
      const maxWidth = pageWidth / 2 - 20; // Half page minus margins
      const maxHeight = pageHeight - 50; // Leave room for header/footer
      
      const imgWidth = maxWidth;
      const imgHeight = canvas.height * (imgWidth / canvas.width);
      
      // Add the chart image to the left side of the page
      pdf.addImage(
        chartImgData, 
        'PNG', 
        14, // Left margin
        25, // Top position below header
        imgWidth, 
        Math.min(imgHeight, maxHeight)
      );
      
      // Add title for the chart
      pdf.setFontSize(14);
      pdf.setTextColor(22, 65, 78); // #16414E
      pdf.text('Outcome Progress Radar', 14, 25);
    } catch (err) {
      console.error('Error rendering radar chart:', err);
      // Continue with the table even if chart fails
    }
    
    // Create a table of outcomes data on the right side
    const tableX = pageWidth / 2 + 5;
    const tableY = 35;
    
    // Table header
    pdf.setFontSize(14);
    pdf.setTextColor(22, 65, 78); // #16414E
    pdf.text('Outcome Metrics', tableX, 25);
    
    // Table headers
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Outcome', tableX, tableY);
    pdf.text('Progress', tableX + 90, tableY);
    pdf.text('Last Updated', tableX + 115, tableY);
    
    // Draw line under headers
    pdf.setDrawColor(200, 200, 200);
    pdf.line(tableX, tableY + 3, tableX + 140, tableY + 3);
    
    // Process outcome data for the table
    const tableData: OutcomeWithProgress[] = outcomes.map(outcome => {
      // Find the latest progress entry for this outcome
      const latestProgress = progressData
        .filter(p => p.outcomeId === outcome.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      
      return {
        outcome,
        progress: latestProgress?.value ?? 0,
        lastUpdated: latestProgress ? format(new Date(latestProgress.updatedAt), "MMM d, yyyy") : null
      };
    });
    
    // Add table data
    let currentY = tableY + 10;
    const rowHeight = 8;
    
    tableData.forEach((row, index) => {
      // Add zebra striping
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(tableX - 3, currentY - 5, 145, rowHeight, 'F');
      }
      
      // Truncate long outcome titles
      const title = row.outcome.title.length > 40
        ? row.outcome.title.substring(0, 37) + '...'
        : row.outcome.title;
      
      pdf.setTextColor(50, 50, 50);
      pdf.text(title, tableX, currentY);
      pdf.text(`${row.progress}%`, tableX + 90, currentY);
      pdf.text(row.lastUpdated || 'Not tracked', tableX + 115, currentY);
      
      currentY += rowHeight;
    });
    
    // If there's no data, show a message
    if (tableData.length === 0) {
      pdf.setTextColor(100, 100, 100);
      pdf.text('No outcome metrics have been selected.', tableX, tableY + 15);
    }
    
    // Add footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('The Connected Outcomes Framework Toolkit', 14, pageHeight - 10);
    pdf.text('Page 1/1', pageWidth - 30, pageHeight - 10);
    
    // Save the PDF
    const fileName = `${projectName.replace(/[^\w\s]/gi, '')}_Outcomes_${fileTimestamp}.pdf`;
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}