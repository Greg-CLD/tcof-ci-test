import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { type Outcome } from "./OutcomeSelectorModal";
import { type OutcomeProgress } from "./OutcomeProgressTracker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OutcomeRadarChartProps {
  outcomes: Outcome[];
  outcomeProgress: OutcomeProgress[];
}

interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

export function OutcomeRadarChart({ outcomes, outcomeProgress }: OutcomeRadarChartProps) {
  // Prepare the data for the radar chart
  const prepareChartData = (): RadarDataPoint[] => {
    // Group progress by outcomeId and get the latest entry for each
    const latestProgressByOutcome = outcomeProgress.reduce((acc, progress) => {
      if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
        acc[progress.outcomeId] = progress;
      }
      return acc;
    }, {} as Record<string, OutcomeProgress>);
    
    // Map outcomes to radar data points
    return outcomes.map(outcome => {
      const progress = latestProgressByOutcome[outcome.id];
      return {
        subject: outcome.title,
        value: progress ? progress.value : 0,
        fullMark: 100,
      };
    });
  };
  
  const data = prepareChartData();
  
  // Get the most recent update timestamp across all outcomes
  const getLatestUpdateTime = (): string | null => {
    if (outcomeProgress.length === 0) return null;
    
    const latestUpdate = outcomeProgress.reduce((latest, current) => {
      const currentDate = new Date(current.updatedAt);
      return currentDate > latest ? currentDate : latest;
    }, new Date(0));
    
    if (latestUpdate.getTime() === 0) return null;
    
    return formatDistanceToNow(latestUpdate, { addSuffix: true });
  };
  
  const latestUpdate = getLatestUpdateTime();
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold">Outcome Progress Overview</CardTitle>
        <CardDescription>
          Visualize your progress towards selected outcomes.
          {latestUpdate && (
            <span className="block text-xs mt-1">Last updated: {latestUpdate}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {outcomes.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select outcomes to track to see progress visualization.
            </AlertDescription>
          </Alert>
        ) : data.every(item => item.value === 0) ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Start tracking progress on your outcomes to see visualization.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="subject"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => 
                    value.length > 15 ? `${value.substring(0, 15)}...` : value
                  }
                />
                <PolarRadiusAxis domain={[0, 100]} tickCount={5} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Progress']}
                  labelFormatter={(label) => label}
                />
                <Radar
                  name="Progress"
                  dataKey="value"
                  stroke="#16414E"
                  fill="#008080"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}