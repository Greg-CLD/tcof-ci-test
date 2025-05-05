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
    const timestamp = format(now, "yyyy-MM-dd");
    const fileTimestamp = format(now, "yyyyMMdd");
    
    // Add header
    pdf.setFontSize(18);
    pdf.setTextColor(22, 65, 78); // #16414E
    pdf.text(projectName, 14, 15);
    
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${timestamp}`, pageWidth - 60, 15);
    
    // Prepare the SVG chart
    try {
      if (!svgElement) {
        throw new Error('SVG element is null or undefined');
      }
      
      // Create a temporary container to hold the SVG for html2canvas
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '800px'; // Fixed width for consistent rendering
      tempContainer.style.height = '800px'; // Fixed height for consistent rendering
      tempContainer.style.display = 'flex';
      tempContainer.style.alignItems = 'center';
      tempContainer.style.justifyContent = 'center';
      tempContainer.style.backgroundColor = 'white';
      
      // Clone the SVG and set dimensions for better quality
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('width', '600');
      clonedSvg.setAttribute('height', '600');
      tempContainer.appendChild(clonedSvg);
      
      document.body.appendChild(tempContainer);
      
      // Convert the SVG to a canvas using html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Higher scale for better quality
        backgroundColor: 'white', // White background to ensure proper rendering
        logging: false,
        useCORS: true
      });
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      // Convert canvas to an image and add to PDF
      const chartImgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit half the page width
      const maxWidth = pageWidth / 2 - 20; // Half page minus margins
      const maxHeight = pageHeight - 60; // Leave room for header/footer
      
      // Calculate scaled dimensions to maintain aspect ratio
      let imgWidth = maxWidth;
      let imgHeight = canvas.height * (imgWidth / canvas.width);
      
      // If height exceeds maximum, scale down proportionally
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = canvas.width * (imgHeight / canvas.height);
      }
      
      // Add title for the chart
      pdf.setFontSize(14);
      pdf.setTextColor(22, 65, 78); // #16414E
      pdf.text('Outcome Progress Radar', 14, 25);
      
      // Add the chart image to the left side of the page
      pdf.addImage(
        chartImgData, 
        'PNG', 
        14, // Left margin
        30, // Top position below header and title
        imgWidth, 
        imgHeight
      );
    } catch (err) {
      console.error('Error rendering radar chart:', err);
      
      // Add error message in place of the chart
      pdf.setFontSize(12);
      pdf.setTextColor(200, 0, 0);
      pdf.text('Could not render radar chart.', 14, 50);
      
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
    
    // Add footer with project name and export date
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`${projectName} | The Connected Outcomes Framework Toolkit`, 14, pageHeight - 10);
    pdf.text(`Generated: ${timestamp} | Page 1/1`, pageWidth - 70, pageHeight - 10);
    
    // Save the PDF
    const fileName = `${projectName.replace(/[^\w\s]/gi, '')}_Outcomes_${fileTimestamp}.pdf`;
    pdf.save(fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}