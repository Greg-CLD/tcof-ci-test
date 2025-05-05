import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { type Outcome } from "@/components/outcomes/OutcomeSelectorModal";
import { type OutcomeProgress } from "@/components/outcomes/OutcomeProgressTracker";

interface PDFExportParams {
  projectName: string;
  outcomes: Outcome[];
  outcomeProgress: OutcomeProgress[];
}

// Create a temporary SVG element to capture for the PDF
function createTemporaryRadarChart(outcomes: Outcome[], outcomeProgress: OutcomeProgress[]): HTMLElement {
  // Create wrapper element
  const wrapper = document.createElement("div");
  wrapper.style.width = "500px";
  wrapper.style.height = "400px";
  wrapper.style.padding = "20px";
  wrapper.style.backgroundColor = "#ffffff";
  
  // Create title
  const title = document.createElement("h2");
  title.textContent = "Outcome Progress Report";
  title.style.textAlign = "center";
  title.style.color = "#16414E";
  title.style.marginBottom = "10px";
  wrapper.appendChild(title);
  
  // Create SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "400");
  svg.setAttribute("height", "300");
  svg.style.margin = "0 auto";
  svg.style.display = "block";
  
  // Chart dimensions
  const width = 400;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) * 0.7;
  
  // Create background grid
  const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  
  // Draw circular grid lines
  [0.2, 0.4, 0.6, 0.8, 1].forEach(factor => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", centerX.toString());
    circle.setAttribute("cy", centerY.toString());
    circle.setAttribute("r", (radius * factor).toString());
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#e2e8f0");
    circle.setAttribute("stroke-width", "1");
    gridGroup.appendChild(circle);
  });
  
  // Helper function to get the latest progress value for an outcome
  const getProgressValue = (outcomeId: string): number => {
    // Find the latest progress entry for this outcome
    const latestProgress = outcomeProgress
      .filter(p => p.outcomeId === outcomeId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    
    return latestProgress?.value ?? 0;
  };
  
  // Draw axis lines and labels
  outcomes.forEach((outcome, i) => {
    const angle = (i / outcomes.length) * 2 * Math.PI - Math.PI / 2;
    const axisX = centerX + radius * Math.cos(angle);
    const axisY = centerY + radius * Math.sin(angle);
    
    // Draw axis line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centerX.toString());
    line.setAttribute("y1", centerY.toString());
    line.setAttribute("x2", axisX.toString());
    line.setAttribute("y2", axisY.toString());
    line.setAttribute("stroke", "#e2e8f0");
    line.setAttribute("stroke-width", "1");
    gridGroup.appendChild(line);
    
    // Add label
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const labelX = centerX + (radius + 15) * Math.cos(angle);
    const labelY = centerY + (radius + 15) * Math.sin(angle);
    
    label.setAttribute("x", labelX.toString());
    label.setAttribute("y", labelY.toString());
    label.setAttribute("text-anchor", angle > Math.PI / 2 && angle < 3 * Math.PI / 2 ? "end" : "start");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "#64748b");
    
    // Truncate long labels
    const maxLabelLength = 12;
    const truncatedLabel = outcome.title.length > maxLabelLength
      ? outcome.title.substring(0, maxLabelLength) + '...'
      : outcome.title;
      
    label.textContent = truncatedLabel;
    gridGroup.appendChild(label);
  });
  
  svg.appendChild(gridGroup);
  
  // Plot the data
  const dataPoints: [number, number][] = [];
  
  outcomes.forEach((outcome, i) => {
    const angle = (i / outcomes.length) * 2 * Math.PI - Math.PI / 2;
    const value = getProgressValue(outcome.id) / 100; // Normalize to 0-1
    const pointX = centerX + radius * value * Math.cos(angle);
    const pointY = centerY + radius * value * Math.sin(angle);
    
    dataPoints.push([pointX, pointY]);
  });
  
  // Create the data polygon
  if (dataPoints.length > 2) {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", dataPoints.map(p => p.join(",")).join(" "));
    polygon.setAttribute("fill", "rgba(0, 120, 120, 0.2)");
    polygon.setAttribute("stroke", "#008080");
    polygon.setAttribute("stroke-width", "2");
    svg.appendChild(polygon);
  }
  
  // Add data points
  dataPoints.forEach(([x, y], i) => {
    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    point.setAttribute("cx", x.toString());
    point.setAttribute("cy", y.toString());
    point.setAttribute("r", "4");
    point.setAttribute("fill", "#008080");
    svg.appendChild(point);
    
    // Add value label
    const value = getProgressValue(outcomes[i].id);
    if (value > 0) {
      const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valueLabel.setAttribute("x", x.toString());
      valueLabel.setAttribute("y", (y - 8).toString());
      valueLabel.setAttribute("text-anchor", "middle");
      valueLabel.setAttribute("font-size", "10");
      valueLabel.setAttribute("font-weight", "bold");
      valueLabel.setAttribute("fill", "#16414E");
      valueLabel.textContent = `${value}%`;
      svg.appendChild(valueLabel);
    }
  });
  
  wrapper.appendChild(svg);
  
  // Create table of outcomes
  const table = document.createElement("table");
  table.style.width = "90%";
  table.style.margin = "20px auto";
  table.style.borderCollapse = "collapse";
  
  // Add header row
  const headerRow = document.createElement("tr");
  
  const thOutcome = document.createElement("th");
  thOutcome.textContent = "Outcome";
  thOutcome.style.textAlign = "left";
  thOutcome.style.padding = "8px";
  thOutcome.style.borderBottom = "1px solid #e2e8f0";
  headerRow.appendChild(thOutcome);
  
  const thProgress = document.createElement("th");
  thProgress.textContent = "Progress";
  thProgress.style.textAlign = "center";
  thProgress.style.padding = "8px";
  thProgress.style.borderBottom = "1px solid #e2e8f0";
  headerRow.appendChild(thProgress);
  
  const thUpdated = document.createElement("th");
  thUpdated.textContent = "Last Updated";
  thUpdated.style.textAlign = "right";
  thUpdated.style.padding = "8px";
  thUpdated.style.borderBottom = "1px solid #e2e8f0";
  headerRow.appendChild(thUpdated);
  
  table.appendChild(headerRow);
  
  // Helper to format date
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Unknown";
    }
  };
  
  // Add data rows
  outcomes.forEach(outcome => {
    const latestProgress = outcomeProgress
      .filter(p => p.outcomeId === outcome.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    
    const row = document.createElement("tr");
    
    const tdOutcome = document.createElement("td");
    tdOutcome.textContent = outcome.title;
    tdOutcome.style.padding = "8px";
    tdOutcome.style.borderBottom = "1px solid #e2e8f0";
    row.appendChild(tdOutcome);
    
    const tdProgress = document.createElement("td");
    tdProgress.textContent = `${latestProgress?.value ?? 0}%`;
    tdProgress.style.textAlign = "center";
    tdProgress.style.padding = "8px";
    tdProgress.style.borderBottom = "1px solid #e2e8f0";
    row.appendChild(tdProgress);
    
    const tdUpdated = document.createElement("td");
    tdUpdated.textContent = latestProgress?.updatedAt ? formatDate(latestProgress.updatedAt) : "Not tracked";
    tdUpdated.style.textAlign = "right";
    tdUpdated.style.padding = "8px";
    tdUpdated.style.borderBottom = "1px solid #e2e8f0";
    row.appendChild(tdUpdated);
    
    table.appendChild(row);
  });
  
  wrapper.appendChild(table);
  
  // Add to DOM temporarily, but offscreen
  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  document.body.appendChild(wrapper);
  
  return wrapper;
}

export async function generatePDF({ projectName, outcomes, outcomeProgress }: PDFExportParams): Promise<void> {
  if (!outcomes.length) {
    throw new Error("No outcomes to export");
  }
  
  // Create chart wrapper
  const chartWrapper = createTemporaryRadarChart(outcomes, outcomeProgress);
  
  try {
    // Convert the chart to canvas
    const canvas = await html2canvas(chartWrapper, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff"
    });
    
    // Create PDF (A4 format)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    // Add title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(22, 65, 78); // #16414E
    pdf.text(`${projectName}`, 105, 20, { align: "center" });
    pdf.setFontSize(14);
    pdf.text("Outcome Progress Report", 105, 30, { align: "center" });
    
    // Add date
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // #64748b
    const today = new Date().toLocaleDateString();
    pdf.text(`Generated on: ${today}`, 105, 37, { align: "center" });
    
    // Add image
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 20, 45, 170, 130);
    
    // Save the PDF
    pdf.save(`${projectName.replace(/\s+/g, "_")}_outcome_report.pdf`);
  } finally {
    // Clean up - remove the temporary element
    if (chartWrapper.parentNode) {
      chartWrapper.parentNode.removeChild(chartWrapper);
    }
  }
}