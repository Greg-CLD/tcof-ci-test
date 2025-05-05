import React from 'react';

/**
 * RadarChart data point interface
 */
export interface RadarChartPoint {
  id: string;
  label: string;
  value: number;
}

/**
 * RadarChart props interface
 */
interface RadarChartProps {
  data: RadarChartPoint[];
  size?: number;
}

/**
 * Radar Chart Component
 * Renders a radar/spider chart with the provided data points
 */
export function RadarChart({ data, size = 120 }: RadarChartProps) {
  // Don't render if no data
  if (!data || data.length === 0) {
    return null;
  }
  
  // Limit to 5 axes max
  const chartData = data.slice(0, 5);
  
  // Calculate dimensions
  const viewBoxSize = 100;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const radius = 40; // Radius for 100% value
  
  // Calculate points on the radar chart
  const calculatePoint = (index: number, value: number, total: number) => {
    // Start at 12 o'clock (270 degrees in standard cartesian) and go clockwise
    const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
    const normalizedValue = Math.max(0, Math.min(100, value)) / 100; // Normalize to 0-1
    const distance = radius * normalizedValue;
    
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle)
    };
  };
  
  // Generate grid circles (25%, 50%, 75%, 100%)
  const gridCircles = [0.25, 0.5, 0.75, 1].map((percentage, i) => (
    <circle
      key={`grid-circle-${i}`}
      cx={centerX}
      cy={centerY}
      r={radius * percentage}
      fill="none"
      stroke="#e2e8f0"
      strokeWidth="0.5"
      strokeDasharray={percentage < 1 ? "1 1" : ""}
    />
  ));
  
  // Grid percentage labels
  const gridLabels = [25, 50, 75, 100].map((percentage, i) => {
    // Position at 12 o'clock
    return (
      <text
        key={`grid-label-${i}`}
        x={centerX}
        y={centerY - (radius * percentage / 100) - 1}
        textAnchor="middle"
        dy="-0.2em"
        fontSize="6"
        fill="#a1a1aa"
      >
        {percentage}%
      </text>
    );
  });
  
  // Generate axes
  const axes = chartData.map((point, i) => {
    const { x, y } = calculatePoint(i, 100, chartData.length);
    
    return (
      <line
        key={`axis-${i}`}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="#e2e8f0"
        strokeWidth="0.5"
      />
    );
  });
  
  // Generate axis labels
  const labels = chartData.map((point, i) => {
    const { x, y } = calculatePoint(i, 112, chartData.length); // 112% to place outside the chart
    
    // Adjust text alignment based on position
    const textAnchor = Math.abs(x - centerX) < 5 
      ? "middle" 
      : x > centerX ? "start" : "end";
    
    const dy = Math.abs(y - centerY) < 5 
      ? (y > centerY ? "0.8em" : "-0.5em") 
      : "0.3em";
    
    // Truncate label if too long
    const shortenedLabel = point.label.length > 12
      ? point.label.substring(0, 10) + '...'
      : point.label;
      
    return (
      <text
        key={`label-${i}`}
        x={x}
        y={y}
        textAnchor={textAnchor}
        dy={dy}
        fontSize="7"
        fontWeight="500"
        fill="#64748b"
      >
        {shortenedLabel}
      </text>
    );
  });
  
  // Generate data points and polygon
  const dataPoints = chartData.map((point, i) => {
    return calculatePoint(i, point.value, chartData.length);
  });
  
  // Create polygon path
  const polygonPoints = dataPoints.map(point => `${point.x},${point.y}`).join(' ');
  
  // Generate dots at data points
  const dots = dataPoints.map((point, i) => (
    <circle
      key={`dot-${i}`}
      cx={point.x}
      cy={point.y}
      r="2.5"
      fill="#0ea5e9"
      filter="drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.2))"
    />
  ));

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
      className="mx-auto"
      style={{ transition: "all 0.3s ease" }}
    >
      {/* Grid circles */}
      {gridCircles}
      
      {/* Grid percentage labels */}
      {gridLabels}
      
      {/* Axes */}
      {axes}
      
      {/* Value polygon with animation */}
      <polygon
        points={polygonPoints}
        fill="rgba(14, 165, 233, 0.2)"
        stroke="#0ea5e9"
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ transition: "all 0.3s ease" }}
      />
      
      {/* Data points */}
      {dots}
      
      {/* Axis labels */}
      {labels}
    </svg>
  );
}