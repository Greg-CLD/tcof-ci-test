import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, DownloadIcon, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { elementToPDF } from '@/lib/pdf-utils';

interface GoalNode {
  id: string;
  text: string;
  timeframe: string;
  x: number;
  y: number;
  type?: string;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

interface GoalMapData {
  name: string;
  nodes: GoalNode[];
  connections: Connection[];
  projectId?: string;
  lastUpdated: number;
  id?: string;
}

interface GoalMappingViewProps {
  map: GoalMapData;
  onEdit: () => void;
  isLoading: boolean;
  svgRef?: React.RefObject<SVGSVGElement>;
}

export function GoalMappingView({ map, onEdit, isLoading }: GoalMappingViewProps) {
  const { toast } = useToast();
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Convert the timestamp to a readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle PDF export
  const handleExportPDF = () => {
    if (containerRef.current) {
      elementToPDF(containerRef.current, `${map.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast({
        title: "PDF generated",
        description: "Your success map has been exported as PDF."
      });
    }
  };
  
  // Group nodes by type (if available) or create default grouping
  const goalsByLevel = map.nodes.reduce((acc: Record<string, GoalNode[]>, node: GoalNode) => {
    // Default to 'strategic' if no type is available
    const level = node.type || 'strategic';
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(node);
    return acc;
  }, {});
  
  // Get a user-friendly level name
  const getLevelName = (level: string) => {
    switch(level) {
      case 'strategic': return 'Strategic Goals';
      case 'business': return 'Business Goals';
      case 'product': return 'Product Goals';
      case 'custom': return 'Custom Goals';
      default: return `${level.charAt(0).toUpperCase() + level.slice(1)} Goals`;
    }
  };
  
  return (
    <Card className="shadow-md overflow-hidden" ref={containerRef}>
      <CardHeader className="flex flex-row items-center justify-between bg-blue-50/70 pb-6">
        <div>
          <CardTitle className="text-2xl text-tcof-dark">
            {map.name}
          </CardTitle>
          <CardDescription>
            Last updated: {formatDate(map.lastUpdated)}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={handleExportPDF}
            disabled={isLoading}
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
          <Button 
            variant="outline" 
            className="text-tcof-teal border-tcof-teal hover:bg-tcof-teal/10"
            onClick={onEdit}
            disabled={isLoading}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Total Goals</div>
            <div className="text-2xl font-bold">{map.nodes.length}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Goal Levels</div>
            <div className="text-2xl font-bold">{Object.keys(goalsByLevel).length}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Relationships</div>
            <div className="text-2xl font-bold">{map.connections.length}</div>
          </div>
        </div>
        
        {/* Goals Table Display */}
        {map.nodes.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(goalsByLevel).map(([level, goals]) => (
              <div key={level} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b font-medium text-gray-700">
                  {getLevelName(level)} ({goals.length})
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-2 px-4 text-left font-medium text-gray-600">Goal</th>
                      <th className="py-2 px-4 text-left font-medium text-gray-600 w-1/4">Timeframe</th>
                      <th className="py-2 px-4 text-left font-medium text-gray-600 w-1/5">Related Goals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => {
                      // Find related goals based on connections
                      const relatedGoals = map.connections
                        .filter(conn => conn.sourceId === goal.id || conn.targetId === goal.id)
                        .map(conn => {
                          const relatedId = conn.sourceId === goal.id ? conn.targetId : conn.sourceId;
                          const related = map.nodes.find(n => n.id === relatedId);
                          return related?.text || '';
                        });
                      
                      return (
                        <tr key={goal.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-start">
                              <Target className="w-5 h-5 text-tcof-teal mt-0.5 mr-2 flex-shrink-0" />
                              <span>{goal.text}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {goal.timeframe ? (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                <span>{goal.timeframe}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No timeframe</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {relatedGoals.length > 0 ? (
                              <div className="text-xs space-y-1">
                                {relatedGoals.map((text, i) => (
                                  <div key={i} className="bg-gray-100 rounded px-2 py-1 inline-block mr-1 mb-1 truncate max-w-[150px]" title={text}>
                                    {text.length > 20 ? `${text.substring(0, 20)}...` : text}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-1">No Goals Yet</h3>
            <p className="text-gray-400 mb-4">Click the Edit button to start adding goals to your map.</p>
            <Button
              onClick={onEdit}
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Create Goals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}