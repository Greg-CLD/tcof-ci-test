import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  GoalMapData, 
  CynefinSelection, 
  TCOFJourneyData,
  CynefinQuadrant,
  ImplementationStage 
} from './storage';

// Format date as "Month DD, YYYY"
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Create a standard TCOF cover page for PDFs
function createCoverPage(pdf: jsPDF, title: string, subtitle: string = ''): void {
  // Background and header
  pdf.setFillColor('#fff5e7'); // light cream background
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
  
  // Top dark header bar
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 40, 'F');
  
  // Title in header
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(18);
  pdf.text('The Connected Outcomes Framework', pdf.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  if (subtitle) {
    pdf.setFontSize(14);
    pdf.text(subtitle, pdf.internal.pageSize.getWidth() / 2, 32, { align: 'center' });
  }
  
  // Main title
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(24);
  pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 70, { align: 'center' });
  
  // Divider
  pdf.setFillColor('#008080'); // tcof-teal
  pdf.roundedRect(pdf.internal.pageSize.getWidth() / 2 - 30, 80, 60, 2, 1, 1, 'F');
  
  // Date
  pdf.setFontSize(12);
  pdf.text(`Generated on ${formatDate(new Date())}`, 
    pdf.internal.pageSize.getWidth() / 2, 100, { align: 'center' });
  
  // Footer
  pdf.setFontSize(10);
  pdf.text(`© ${new Date().getFullYear()} Confluity`, 
    pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 20, { align: 'center' });
  
  // Confidentiality notice
  pdf.setFontSize(8);
  pdf.text('This document is generated for your personal use and contains your inputs from the TCOF Toolkit.',
    pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
}

// Add a standard TCOF page header
function addPageHeader(pdf: jsPDF, title: string, pageNumber?: number): void {
  // Header bar
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 15, 'F');
  
  // Title in header
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(11);
  pdf.text(`TCOF - ${title}`, 10, 10);
  
  // Page number if provided
  if (pageNumber !== undefined) {
    pdf.text(`Page ${pageNumber}`, pdf.internal.pageSize.getWidth() - 10, 10, { align: 'right' });
  }
}

// Add a standard TCOF page footer
function addPageFooter(pdf: jsPDF): void {
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Footer line
  pdf.setDrawColor('#16414E'); // tcof-dark
  pdf.line(10, pageHeight - 15, pdf.internal.pageSize.getWidth() - 10, pageHeight - 15);
  
  // Footer text
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(8);
  pdf.text(`Generated on ${formatDate(new Date())} | © ${new Date().getFullYear()} Confluity`, 
    pdf.internal.pageSize.getWidth() / 2, pageHeight - 8, { align: 'center' });
}

// Convert a DOM element to PDF with professional formatting
export async function elementToPDF(element: HTMLElement, fileName: string, title: string = ''): Promise<void> {
  try {
    // Fix for possible scaling issues
    const originalTransform = element.style.transform;
    element.style.transform = '';
    
    // Render using html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      allowTaint: true,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight
    });
    
    // Reset element transform if needed
    element.style.transform = originalTransform;
    
    // Get image data
    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with A4 size
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add cover page
    createCoverPage(pdf, title || 'TCOF Tool Results', 'Tool Output');
    
    // Add content page
    pdf.addPage();
    addPageHeader(pdf, title || 'Tool Results', 2);
    
    // Calculate dimensions to fit on page with margins
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Calculate height based on aspect ratio
    const aspectRatio = canvas.height / canvas.width;
    let contentHeight = contentWidth * aspectRatio;
    
    // Check if content is too tall for one page (accounting for header and footer)
    const maxContentHeight = pageHeight - (margin * 2) - 20; // 20 for header/footer
    
    if (contentHeight > maxContentHeight) {
      // Content won't fit on one page, we need to slice it
      
      // First, determine how many slices we need
      const slices = Math.ceil(contentHeight / maxContentHeight);
      const sliceHeight = canvas.height / slices;
      
      // For each slice
      for (let i = 0; i < slices; i++) {
        if (i > 0) {
          pdf.addPage();
          addPageHeader(pdf, title || 'Tool Results', i + 2); // +2 because we already have cover + first page
        }
        
        // Calculate source and destination coordinates
        const sy = i * sliceHeight;
        const sh = Math.min(sliceHeight, canvas.height - sy);
        const dy = margin;
        const dh = (sh / sliceHeight) * maxContentHeight;
        
        // Add this slice of the image - clip to just the part we need
        // Note: Some versions of jsPDF handle clipping differently
        try {
          // Create a new canvas just for this slice
          const sliceCanvas = document.createElement('canvas');
          const sliceCtx = sliceCanvas.getContext('2d');
          
          if (sliceCtx) {
            // Set the slice canvas dimensions
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sh;
            
            // Draw only the slice of the original canvas that we need
            sliceCtx.drawImage(
              canvas, 
              0, sy, canvas.width, sh,
              0, 0, canvas.width, sh
            );
            
            // Convert the slice to image data
            const sliceImgData = sliceCanvas.toDataURL('image/png');
            
            // Add the slice to the PDF
            pdf.addImage(sliceImgData, 'PNG', margin, dy, contentWidth, dh);
          } else {
            // Fallback if we can't create a slice
            pdf.addImage(imgData, 'PNG', margin, dy, contentWidth, dh);
          }
        } catch (e) {
          // Fallback to simpler approach
          console.log('Using fallback image rendering method');
          pdf.addImage(imgData, 'PNG', margin, dy, contentWidth, dh);
        }
        
        // Add footer to each page
        addPageFooter(pdf);
      }
    } else {
      // Content fits on one page
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      addPageFooter(pdf);
    }
    
    // Save PDF
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

// Get readable string for Cynefin quadrant
function getCynefinQuadrantText(quadrant: CynefinQuadrant | null): string {
  if (!quadrant) return 'Not Selected';
  
  const mapping: Record<CynefinQuadrant, string> = {
    'clear': 'Clear',
    'complicated': 'Complicated',
    'complex': 'Complex',
    'chaotic': 'Chaotic'
  };
  
  return mapping[quadrant];
}

// Get readable string for TCOF stage
function getTCOFStageText(stage: ImplementationStage | null): string {
  if (!stage) return 'Not Selected';
  
  const mapping: Record<ImplementationStage, string> = {
    'identification': 'Identification',
    'definition': 'Definition',
    'delivery': 'Delivery',
    'closure': 'Closure'
  };
  
  return mapping[stage];
}

// Get readable string for Resource Level
function getResourceLevelText(level: string | null): string {
  if (!level) return 'Not Selected';
  
  const mapping: Record<string, string> = {
    'minimal': 'Minimal',
    'adequate': 'Adequate',
    'abundant': 'Abundant'
  };
  
  return mapping[level] || 'Not Selected';
}

// Get readable string for Priority
function getPriorityText(priority: string | null): string {
  if (!priority) return 'Not Selected';
  
  const mapping: Record<string, string> = {
    'efficiency': 'Efficiency',
    'innovation': 'Innovation',
    'experience': 'Experience',
    'cost': 'Cost'
  };
  
  return mapping[priority] || 'Not Selected';
}

// Get readable string for Timeframe
function getTimeframeText(timeframe: string | null): string {
  if (!timeframe) return 'Not Selected';
  
  const mapping: Record<string, string> = {
    'immediate': 'Immediate',
    'short': 'Short Term',
    'medium': 'Medium Term',
    'long': 'Long Term'
  };
  
  return mapping[timeframe] || 'Not Selected';
}

// Get readable string for Evaluation Frequency
function getEvaluationFrequencyText(frequency: string | null): string {
  if (!frequency) return 'Not Selected';
  
  const mapping: Record<string, string> = {
    'weekly': 'Weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'annually': 'Annually'
  };
  
  return mapping[frequency] || 'Not Selected';
}

// Generate a complete PDF with all tool data
export function generateCompletePDF(
  goalMapData: GoalMapData | null,
  cynefinSelection: CynefinSelection | null,
  tcofJourneyData: TCOFJourneyData | null
): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Cover Page
  createCoverPage(pdf, 'TCOF Part B Plan', 'Complete Assessment');
  
  // Table of Contents Page
  pdf.addPage();
  addPageHeader(pdf, 'Table of Contents', 2);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(16);
  pdf.text('Contents', 20, 30);
  
  pdf.setFontSize(12);
  let tocY = 50;
  
  pdf.text('1. Goal-Mapping Tool', 20, tocY);
  pdf.text('3', 180, tocY, { align: 'right' });
  tocY += 10;
  
  pdf.text('2. Cynefin Orientation', 20, tocY);
  pdf.text('4', 180, tocY, { align: 'right' });
  tocY += 10;
  
  pdf.text('3. TCOF Journey Decision Tree', 20, tocY);
  pdf.text('5', 180, tocY, { align: 'right' });
  tocY += 20;
  
  pdf.setFontSize(10);
  pdf.text('This document contains your inputs from each of the TCOF Starter Kit tools.', 20, tocY);
  tocY += 8;
  pdf.text('It is designed to help you document and share your journey through the', 20, tocY);
  tocY += 8;
  pdf.text('Connected Outcomes Framework planning process.', 20, tocY);
  
  addPageFooter(pdf);
  
  // Goal-Mapping Section
  pdf.addPage();
  addPageHeader(pdf, 'Goal-Mapping Tool', 3);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(18);
  pdf.text('1. Goal-Mapping Tool', 20, 30);
  
  // Add divider
  pdf.setDrawColor('#008080'); // tcof-teal
  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 80, 35);
  
  if (!goalMapData || goalMapData.nodes.length === 0) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 50);
  } else {
    // Display the goal map data
    pdf.setFontSize(12);
    pdf.text('Your Success Map contains the following goals:', 20, 50);
    
    let y = 65;
    goalMapData.nodes.forEach((node, index) => {
      // Check if we need a new page
      if (y > pdf.internal.pageSize.getHeight() - 30) {
        addPageFooter(pdf);
        pdf.addPage();
        const pageNum = 3 + Math.floor(index / 4); // Assuming about 4 goals per page
        addPageHeader(pdf, 'Goal-Mapping Tool', pageNum);
        y = 30;
      }
      
      // Draw node box
      pdf.setDrawColor('#008080'); // tcof-teal
      pdf.setFillColor('#fff5e7'); // tcof-light
      pdf.roundedRect(15, y, 180, 25, 3, 3, 'FD');
      
      // Node text
      pdf.setFontSize(11);
      pdf.setTextColor('#16414E');
      
      // Wrap text if needed
      const splitText = pdf.splitTextToSize(`Goal ${index + 1}: ${node.text}`, 170);
      pdf.text(splitText, 20, y + 8);
      
      // Timeframe
      pdf.setFontSize(9);
      pdf.text(`Timeframe: ${node.timeframe}`, 20, y + 20);
      
      y += 30;
    });
    
    // Add connections info
    if (goalMapData.connections.length > 0) {
      if (y > pdf.internal.pageSize.getHeight() - 30) {
        addPageFooter(pdf);
        pdf.addPage();
        const pageNum = 3 + Math.ceil(goalMapData.nodes.length / 4);
        addPageHeader(pdf, 'Goal-Mapping Tool', pageNum);
        y = 30;
      }
      
      pdf.setFontSize(10);
      pdf.text(`Your map has ${goalMapData.connections.length} connection(s) between goals, indicating relationships.`, 20, y + 5);
    }
  }
  
  addPageFooter(pdf);
  
  // Cynefin Orientation Section
  pdf.addPage();
  addPageHeader(pdf, 'Cynefin Orientation', 4);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(18);
  pdf.text('2. Cynefin Orientation Tool', 20, 30);
  
  // Add divider
  pdf.setDrawColor('#008080'); // tcof-teal
  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 90, 35);
  
  if (!cynefinSelection || !cynefinSelection.quadrant) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 50);
  } else {
    // Display the Cynefin selection
    pdf.setFontSize(14);
    pdf.text('Your Domain Type:', 20, 50);
    
    pdf.setFontSize(18);
    pdf.setTextColor('#008080'); // tcof-teal
    pdf.text(getCynefinQuadrantText(cynefinSelection.quadrant), 20, 65);
    
    pdf.setTextColor('#16414E'); // tcof-dark
    pdf.setFontSize(12);
    
    // Draw Cynefin quadrant diagram (simplified)
    const centerX = pdf.internal.pageSize.getWidth() / 2;
    const centerY = 100;
    const size = 40;
    
    // Draw the four quadrants
    pdf.setDrawColor('#008080'); // tcof-teal
    pdf.setLineWidth(0.7);
    
    // Clear quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'clear' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX - size, centerY - size, size, size, 'FD');
    pdf.text('Clear', centerX - size + 10, centerY - size + 15);
    
    // Complicated quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'complicated' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX, centerY - size, size, size, 'FD');
    pdf.text('Complicated', centerX + 5, centerY - size + 15);
    
    // Complex quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'complex' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX - size, centerY, size, size, 'FD');
    pdf.text('Complex', centerX - size + 10, centerY + 15);
    
    // Chaotic quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'chaotic' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX, centerY, size, size, 'FD');
    pdf.text('Chaotic', centerX + 10, centerY + 15);
    
    // Description based on selection
    pdf.setFontSize(11);
    let description = '';
    switch(cynefinSelection.quadrant) {
      case 'clear':
        description = 'In the Clear domain, cause and effect relationships are obvious. Best practice can be identified and repeated with predictable results.';
        break;
      case 'complicated':
        description = 'In the Complicated domain, cause and effect relationships exist but may not be immediately apparent. Expert analysis is needed to understand the situation.';
        break;
      case 'complex':
        description = 'In the Complex domain, cause and effect can only be understood in retrospect. Patterns emerge through interactions, requiring experimentation and flexibility.';
        break;
      case 'chaotic':
        description = 'In the Chaotic domain, no cause and effect relationships can be determined. Immediate action is needed to establish some stability.';
        break;
    }
    
    // Add a box around the description
    pdf.setFillColor('#fff5e7'); // tcof-light
    pdf.roundedRect(15, centerY + size + 10, pdf.internal.pageSize.getWidth() - 30, 35, 3, 3, 'FD');
    
    const splitDescription = pdf.splitTextToSize(description, 170);
    pdf.text(splitDescription, 20, centerY + size + 25);
    
    // Implications for approach
    pdf.setFontSize(12);
    pdf.text('Implications for your approach:', 20, centerY + size + 55);
    
    pdf.setFontSize(10);
    let approach = '';
    switch(cynefinSelection.quadrant) {
      case 'clear':
        approach = '• Use best practices and established processes\n• Focus on efficiency and standardization\n• Clear communication and documentation is effective';
        break;
      case 'complicated':
        approach = '• Rely on expert knowledge and analysis\n• Consider multiple options before deciding\n• Detailed planning with room for expert judgment';
        break;
      case 'complex':
        approach = '• Use probe-sense-respond approach\n• Try safe-to-fail experiments\n• Encourage emergence of novel practices\n• Adapt frequently based on feedback';
        break;
      case 'chaotic':
        approach = '• Act quickly to establish order\n• Focus on containment first\n• Once stabilized, determine next domain\n• Novel practices may emerge from crisis';
        break;
    }
    
    pdf.text(approach, 25, centerY + size + 65);
  }
  
  addPageFooter(pdf);
  
  // TCOF Journey Section
  pdf.addPage();
  addPageHeader(pdf, 'TCOF Journey Decision Tree', 5);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(18);
  pdf.text('3. TCOF Journey Decision Tree', 20, 30);
  
  // Add divider
  pdf.setDrawColor('#008080'); // tcof-teal
  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 110, 35);
  
  if (!tcofJourneyData || !tcofJourneyData.stage) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 50);
  } else {
    // Display the TCOF Journey data
    pdf.setFontSize(14);
    pdf.text('Your Current Implementation Stage:', 20, 50);
    
    pdf.setFontSize(18);
    pdf.setTextColor('#008080'); // tcof-teal
    pdf.text(getTCOFStageText(tcofJourneyData.stage), 20, 65);
    
    // Draw timeline showing the four stages
    pdf.setFillColor('#16414E'); // tcof-dark
    pdf.rect(20, 80, 170, 2, 'F');
    
    // Draw stage markers
    const stagePositions = [30, 80, 140, 180];
    const stages: ImplementationStage[] = ['identification', 'definition', 'delivery', 'closure'];
    const stageNames = ['Identification', 'Definition', 'Delivery', 'Closure'];
    
    stages.forEach((stage, index) => {
      const x = stagePositions[index];
      const isCurrentStage = tcofJourneyData.stage === stage;
      
      // Draw marker
      pdf.setFillColor(isCurrentStage ? '#008080' : '#16414E'); // tcof-teal or tcof-dark
      pdf.circle(x, 81, isCurrentStage ? 5 : 3, 'F');
      
      // Stage name
      pdf.setTextColor(isCurrentStage ? '#008080' : '#16414E');
      pdf.setFontSize(isCurrentStage ? 11 : 9);
      pdf.text(stageNames[index], x, 95, { align: 'center' });
    });
    
    // Journey details
    pdf.setTextColor('#16414E');
    pdf.setFontSize(14);
    pdf.text('Journey Details:', 20, 115);
    
    // Create a table for journey details
    pdf.setFillColor('#fff5e7'); // tcof-light
    pdf.roundedRect(20, 125, 170, 90, 3, 3, 'FD');
    
    pdf.setFontSize(11);
    let y = 135;
    const col1 = 25;
    const col2 = 120;
    
    // Technical expertise
    pdf.setTextColor('#16414E'); // Safe alternative to setFont with type issues
    pdf.setFontSize(11);
    pdf.text('Technical Expertise Level:', col1, y);
    pdf.text(`${tcofJourneyData.capabilities.technicalExpertise}/10`, col2, y);
    y += 10;
    
    // Resource level
    pdf.text('Resource Level:', col1, y);
    pdf.text(getResourceLevelText(tcofJourneyData.capabilities.resources), col2, y);
    y += 10;
    
    // Priority focus
    pdf.text('Priority Focus:', col1, y);
    pdf.text(getPriorityText(tcofJourneyData.priority), col2, y);
    y += 10;
    
    // Implementation timeframe
    pdf.text('Implementation Timeframe:', col1, y);
    pdf.text(getTimeframeText(tcofJourneyData.implementation.timeframe), col2, y);
    y += 10;
    
    // Evaluation frequency
    pdf.text('Evaluation Frequency:', col1, y);
    pdf.text(getEvaluationFrequencyText(tcofJourneyData.metrics.evaluationFrequency), col2, y);
    y += 10;
    
    // Constraints
    if (tcofJourneyData.implementation.constraints.length > 0) {
      y += 5;
      // Use setFontSize instead of setFont to avoid TypeScript errors
      pdf.setFontSize(11);
      pdf.text('Implementation Constraints:', col1, y);
      y += 8;
      
      pdf.setFontSize(10);
      tcofJourneyData.implementation.constraints.forEach(constraint => {
        pdf.text(`• ${constraint}`, col1 + 5, y);
        y += 6;
      });
    }
    
    // Check if we need a new page for metrics and notes
    let needsNewPage = y > pdf.internal.pageSize.getHeight() - 60;
    
    if (needsNewPage) {
      addPageFooter(pdf);
      pdf.addPage();
      addPageHeader(pdf, 'TCOF Journey Decision Tree', 6);
      y = 30;
    } else {
      y += 10;
    }
    
    // Primary metrics
    if (tcofJourneyData.metrics.primary.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Success Metrics:', 20, y);
      y += 10;
      
      // Background for metrics
      pdf.setFillColor('#fff5e7'); // tcof-light
      const metricsHeight = tcofJourneyData.metrics.primary.length * 8 + 10;
      pdf.roundedRect(20, y, 170, metricsHeight, 3, 3, 'FD');
      
      y += 8;
      pdf.setFontSize(11);
      tcofJourneyData.metrics.primary.forEach(metric => {
        pdf.text(`• ${metric}`, 25, y);
        y += 8;
      });
    }
    
    // Check if we need another page for notes
    needsNewPage = y > pdf.internal.pageSize.getHeight() - 60;
    
    // Notes
    if (Object.keys(tcofJourneyData.notes).length > 0) {
      if (needsNewPage) {
        addPageFooter(pdf);
        pdf.addPage();
        addPageHeader(pdf, 'TCOF Journey Decision Tree', 7);
        y = 30;
      } else {
        y += 15;
      }
      
      pdf.setFontSize(14);
      pdf.text('Notes:', 20, y);
      y += 10;
      
      const notesEntries = Object.entries(tcofJourneyData.notes).filter(([_, note]) => note && note.trim() !== '');
      
      if (notesEntries.length > 0) {
        // Background for notes
        pdf.setFillColor('#fff5e7'); // tcof-light
        const notesHeight = Math.min(100, notesEntries.length * 30 + 10);
        pdf.roundedRect(20, y, 170, notesHeight, 3, 3, 'FD');
        
        y += 8;
        pdf.setFontSize(10);
        
        notesEntries.forEach(([key, note]) => {
          // Use styling without setFont to avoid TypeScript errors
          pdf.setFontSize(10);
          pdf.setTextColor('#16414E');
          pdf.text(key + ':', 25, y);
          y += 6;
          
          pdf.setFontSize(9);
          const noteText = pdf.splitTextToSize(note, 160);
          pdf.text(noteText, 30, y);
          y += noteText.length * 6 + 8;
          
          // Check if we need a new page
          if (y > pdf.internal.pageSize.getHeight() - 25 && notesEntries.indexOf([key, note]) < notesEntries.length - 1) {
            addPageFooter(pdf);
            pdf.addPage();
            addPageHeader(pdf, 'TCOF Journey Decision Tree', 8);
            y = 30;
          }
        });
      }
    }
  }
  
  addPageFooter(pdf);
  
  // Save the PDF
  pdf.save('TCOF-Part-B-Plan.pdf');
}