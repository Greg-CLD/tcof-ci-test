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

// Convert a DOM element to PDF
export async function elementToPDF(element: HTMLElement, fileName: string): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add Confluity TCOF Header
    pdf.setFillColor('#16414E'); // tcof-dark
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 20, 'F');
    pdf.setTextColor('#FFFFFF'); // white
    pdf.setFontSize(12);
    pdf.text('The Connected Outcomes Framework Toolkit', 10, 13);
    
    // Calculate dimensions
    const imgWidth = pdf.internal.pageSize.getWidth() - 20; // margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image
    pdf.addImage(imgData, 'PNG', 10, 25, imgWidth, imgHeight);
    
    // Add footer
    pdf.setTextColor('#16414E'); // tcof-dark
    pdf.setFontSize(8);
    pdf.text(`Generated on ${formatDate(new Date())} | © ${new Date().getFullYear()} Confluity`, 10, pdf.internal.pageSize.getHeight() - 10);
    
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
  
  // Title Page
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 40, 'F');
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(20);
  pdf.text('The Connected Outcomes Framework', pdf.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  pdf.setFontSize(16);
  pdf.text('Part B Plan', pdf.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
  
  pdf.setTextColor('#16414E'); // tcof-dark
  pdf.setFontSize(12);
  pdf.text(`Generated on ${formatDate(new Date())}`, pdf.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
  
  pdf.setFillColor('#008080'); // tcof-teal
  pdf.rect(pdf.internal.pageSize.getWidth() / 2 - 40, 60, 80, 1, 'F');
  
  pdf.setFontSize(10);
  pdf.text('This document contains your TCOF toolkit inputs for:', 
    pdf.internal.pageSize.getWidth() / 2, 70, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('Goal-Mapping', 
    pdf.internal.pageSize.getWidth() / 2, 90, { align: 'center' });
  pdf.text('Cynefin Orientation', 
    pdf.internal.pageSize.getWidth() / 2, 100, { align: 'center' });
  pdf.text('TCOF Journey Decision Tree', 
    pdf.internal.pageSize.getWidth() / 2, 110, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.text(`© ${new Date().getFullYear()} Confluity`, 
    pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
  
  // Goal-Mapping Section
  pdf.addPage();
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 20, 'F');
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(16);
  pdf.text('1. Goal-Mapping Tool', 10, 13);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  if (!goalMapData || goalMapData.nodes.length === 0) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 40);
  } else {
    // Display the goal map data
    pdf.setFontSize(12);
    pdf.text('Your Success Map:', 20, 30);
    
    let y = 40;
    goalMapData.nodes.forEach((node, index) => {
      // Ensure we don't run out of page
      if (y > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 20;
        pdf.setTextColor('#16414E');
      }
      
      // Draw node box
      pdf.setDrawColor('#008080'); // tcof-teal
      pdf.setFillColor('#fff5e7'); // tcof-light
      pdf.roundedRect(15, y, 180, 25, 3, 3, 'FD');
      
      // Node text
      pdf.setFontSize(11);
      pdf.setTextColor('#16414E');
      pdf.text(`Goal ${index + 1}: ${node.text}`, 20, y + 8);
      
      // Timeframe
      pdf.setFontSize(9);
      pdf.text(`Timeframe: ${node.timeframe}`, 20, y + 18);
      
      y += 30;
    });
    
    // Add connections info
    if (goalMapData.connections.length > 0) {
      pdf.text(`Connections between goals: ${goalMapData.connections.length}`, 20, y + 5);
    }
  }
  
  // Cynefin Orientation Section
  pdf.addPage();
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 20, 'F');
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(16);
  pdf.text('2. Cynefin Orientation Tool', 10, 13);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  if (!cynefinSelection || !cynefinSelection.quadrant) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 40);
  } else {
    // Display the Cynefin selection
    pdf.setFontSize(14);
    pdf.text('Your Domain Type:', 20, 40);
    
    pdf.setFontSize(16);
    pdf.setTextColor('#008080'); // tcof-teal
    pdf.text(getCynefinQuadrantText(cynefinSelection.quadrant), 20, 55);
    
    pdf.setTextColor('#16414E'); // tcof-dark
    pdf.setFontSize(12);
    
    // Draw Cynefin quadrant diagram (simplified)
    const centerX = pdf.internal.pageSize.getWidth() / 2;
    const centerY = 100;
    const size = 60;
    
    // Draw the four quadrants
    pdf.setDrawColor('#008080'); // tcof-teal
    pdf.setFillColor('#FFFFFF');
    
    // Clear quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'clear' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX - size, centerY - size, size, size, 'FD');
    pdf.text('Clear', centerX - size + 10, centerY - size + 15);
    
    // Complicated quadrant
    pdf.setFillColor(cynefinSelection.quadrant === 'complicated' ? '#fff5e7' : '#FFFFFF');
    pdf.rect(centerX, centerY - size, size, size, 'FD');
    pdf.text('Complicated', centerX + 10, centerY - size + 15);
    
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
    
    const splitDescription = pdf.splitTextToSize(description, 170);
    pdf.text(splitDescription, 20, centerY + size + 20);
  }
  
  // TCOF Journey Section
  pdf.addPage();
  pdf.setFillColor('#16414E'); // tcof-dark
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 20, 'F');
  pdf.setTextColor('#FFFFFF'); // white
  pdf.setFontSize(16);
  pdf.text('3. TCOF Journey Decision Tree', 10, 13);
  
  pdf.setTextColor('#16414E'); // tcof-dark
  if (!tcofJourneyData || !tcofJourneyData.stage) {
    pdf.setFontSize(12);
    pdf.text('This section was left blank.', 20, 40);
  } else {
    // Display the TCOF Journey data
    pdf.setFontSize(14);
    pdf.text('Your Current Stage:', 20, 40);
    
    pdf.setFontSize(16);
    pdf.setTextColor('#008080'); // tcof-teal
    pdf.text(getTCOFStageText(tcofJourneyData.stage), 20, 55);
    
    // Draw timeline showing the four stages
    pdf.setFillColor('#16414E'); // tcof-dark
    pdf.rect(20, 65, 170, 3, 'F');
    
    // Draw stage markers
    const stagePositions = [20, 70, 120, 170];
    const stages: ImplementationStage[] = ['identification', 'definition', 'delivery', 'closure'];
    const stageNames = ['Identification', 'Definition', 'Delivery', 'Closure'];
    
    stages.forEach((stage, index) => {
      const x = stagePositions[index];
      const isCurrentStage = tcofJourneyData.stage === stage;
      
      // Draw marker
      pdf.setFillColor(isCurrentStage ? '#008080' : '#16414E'); // tcof-teal or tcof-dark
      pdf.circle(x, 66.5, isCurrentStage ? 6 : 4, 'F');
      
      // Stage name
      pdf.setTextColor(isCurrentStage ? '#008080' : '#16414E');
      pdf.setFontSize(isCurrentStage ? 11 : 9);
      pdf.text(stageNames[index], x, 80, { align: 'center' });
    });
    
    // Journey details
    pdf.setTextColor('#16414E');
    pdf.setFontSize(12);
    let y = 100;
    
    pdf.text('Journey Details:', 20, y);
    y += 10;
    
    pdf.setFontSize(10);
    pdf.text(`Technical Expertise Level: ${tcofJourneyData.capabilities.technicalExpertise}/10`, 30, y);
    y += 8;
    
    pdf.text(`Resource Level: ${getResourceLevelText(tcofJourneyData.capabilities.resources)}`, 30, y);
    y += 8;
    
    pdf.text(`Priority Focus: ${getPriorityText(tcofJourneyData.priority)}`, 30, y);
    y += 8;
    
    pdf.text(`Implementation Timeframe: ${getTimeframeText(tcofJourneyData.implementation.timeframe)}`, 30, y);
    y += 8;
    
    // Constraints
    if (tcofJourneyData.implementation.constraints.length > 0) {
      pdf.text('Implementation Constraints:', 30, y);
      y += 8;
      tcofJourneyData.implementation.constraints.forEach(constraint => {
        pdf.text(`• ${constraint}`, 40, y);
        y += 6;
      });
    }
    
    // Primary metrics
    if (tcofJourneyData.metrics.primary.length > 0) {
      y += 4;
      pdf.text('Primary Success Metrics:', 30, y);
      y += 8;
      tcofJourneyData.metrics.primary.forEach(metric => {
        pdf.text(`• ${metric}`, 40, y);
        y += 6;
      });
    }
    
    y += 4;
    pdf.text(`Evaluation Frequency: ${getEvaluationFrequencyText(tcofJourneyData.metrics.evaluationFrequency)}`, 30, y);
    
    // Notes
    if (Object.keys(tcofJourneyData.notes).length > 0) {
      y += 12;
      pdf.text('Notes:', 30, y);
      y += 8;
      
      Object.entries(tcofJourneyData.notes).forEach(([key, note]) => {
        if (note && note.trim() !== '') {
          const noteText = pdf.splitTextToSize(`${key}: ${note}`, 150);
          pdf.text(noteText, 40, y);
          y += 6 * noteText.length + 4;
        }
      });
    }
  }
  
  // Save the PDF
  pdf.save('TCOF-Part-B-Plan.pdf');
}