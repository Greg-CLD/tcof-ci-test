import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type Outcome } from "./OutcomeSelectorModal";
import { type OutcomeProgress } from "./OutcomeProgressTracker";

export interface OutcomeRadarChartRef {
  getSvgElement: () => SVGSVGElement | null;
}

interface OutcomeRadarChartProps {
  outcomes: Outcome[];
  outcomeProgress: OutcomeProgress[];
}

export const OutcomeRadarChart = forwardRef<OutcomeRadarChartRef, OutcomeRadarChartProps>((props, ref) => {
  const { outcomes, outcomeProgress } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Expose the SVG element to the parent component
  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current
  }));
  
  // Get the latest progress for each outcome
  const getProgressValue = (outcomeId: string): number => {
    // Find the latest progress entry for this outcome
    const latestProgress = outcomeProgress
      .filter(p => p.outcomeId === outcomeId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    
    return latestProgress?.value ?? 0;
  };
  
  // Draw the radar chart
  useEffect(() => {
    if (!svgRef.current || outcomes.length === 0) return;
    
    const svg = svgRef.current;
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Chart dimensions
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Create background grid
    const gridGroup = document.createElementNS(svgNS, "g");
    gridGroup.setAttribute("class", "grid");
    
    // Draw circular grid lines
    [0.2, 0.4, 0.6, 0.8, 1].forEach(factor => {
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", centerX.toString());
      circle.setAttribute("cy", centerY.toString());
      circle.setAttribute("r", (radius * factor).toString());
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "#e2e8f0");
      circle.setAttribute("stroke-width", "1");
      gridGroup.appendChild(circle);
    });
    
    // Draw axis lines and labels
    outcomes.forEach((outcome, i) => {
      const angle = (i / outcomes.length) * 2 * Math.PI - Math.PI / 2;
      const axisX = centerX + radius * Math.cos(angle);
      const axisY = centerY + radius * Math.sin(angle);
      
      // Draw axis line
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", centerX.toString());
      line.setAttribute("y1", centerY.toString());
      line.setAttribute("x2", axisX.toString());
      line.setAttribute("y2", axisY.toString());
      line.setAttribute("stroke", "#e2e8f0");
      line.setAttribute("stroke-width", "1");
      gridGroup.appendChild(line);
      
      // Add label
      const label = document.createElementNS(svgNS, "text");
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
      const polygon = document.createElementNS(svgNS, "polygon");
      polygon.setAttribute("points", dataPoints.map(p => p.join(",")).join(" "));
      polygon.setAttribute("fill", "rgba(0, 120, 120, 0.2)");
      polygon.setAttribute("stroke", "#008080");
      polygon.setAttribute("stroke-width", "2");
      svg.appendChild(polygon);
    }
    
    // Add data points
    dataPoints.forEach(([x, y], i) => {
      const point = document.createElementNS(svgNS, "circle");
      point.setAttribute("cx", x.toString());
      point.setAttribute("cy", y.toString());
      point.setAttribute("r", "4");
      point.setAttribute("fill", "#008080");
      svg.appendChild(point);
      
      // Add value label
      const value = getProgressValue(outcomes[i].id);
      if (value > 0) {
        const valueLabel = document.createElementNS(svgNS, "text");
        const angle = (i / outcomes.length) * 2 * Math.PI - Math.PI / 2;
        const labelX = centerX + (radius * (value / 100) + 15) * Math.cos(angle);
        const labelY = centerY + (radius * (value / 100) + 15) * Math.sin(angle);
        
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
    
    // Add title
    const title = document.createElementNS(svgNS, "text");
    title.setAttribute("x", centerX.toString());
    title.setAttribute("y", "20");
    title.setAttribute("text-anchor", "middle");
    title.setAttribute("font-size", "12");
    title.setAttribute("font-weight", "bold");
    title.setAttribute("fill", "#16414E");
    title.textContent = "Outcome Progress";
    svg.appendChild(title);
    
  }, [outcomes, outcomeProgress]);
  
  if (outcomes.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-4 flex items-center justify-center min-h-[250px]">
          <p className="text-sm text-muted-foreground text-center">
            Select outcomes to visualize progress
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full h-full">
      <CardContent className="p-4">
        <svg
          ref={svgRef}
          width="100%"
          height="250"
          viewBox="0 0 300 300"
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
        />
      </CardContent>
    </Card>
  );
});