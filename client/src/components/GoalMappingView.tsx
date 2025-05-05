import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, DownloadIcon, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { elementToPDF } from '@/lib/pdf-utils';

interface GoalMapData {
  name: string;
  nodes: any[];
  connections: any[];
  projectId?: string;
  lastUpdated: number;
  id?: string;
}

interface GoalMappingViewProps {
  map: GoalMapData;
  onEdit: () => void;
  isLoading: boolean;
  svgRef: React.RefObject<SVGSVGElement>;
}

export function GoalMappingView({ map, onEdit, isLoading, svgRef }: GoalMappingViewProps) {
  const { toast } = useToast();
  
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
    if (svgRef.current) {
      const container = svgRef.current.parentElement;
      if (container) {
        elementToPDF(container, `${map.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        toast({
          title: "PDF generated",
          description: "Your success map has been exported as PDF."
        });
      }
    }
  };
  
  // Summary data
  const nodesByType = map.nodes.reduce((acc: Record<string, number>, node: any) => {
    const type = node.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return (
    <Card className="shadow-md overflow-hidden">
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
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Connections</div>
            <div className="text-2xl font-bold">{map.connections.length}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Goal Types</div>
            <div className="text-2xl font-bold">{Object.keys(nodesByType).length}</div>
          </div>
        </div>
      
        <div className="mt-6 flex justify-center">
          {svgRef.current && (
            <div className="border border-gray-200 rounded-md p-4 bg-white shadow-sm max-w-full overflow-auto">
              {/* This is where the SVG visualization will be shown */}
              <div className="text-center text-gray-500 italic text-sm">
                Preview of Success Map visualization
              </div>
            </div>
          )}
        </div>
        
        {map.nodes.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Goal Distribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="py-2 px-4 text-left font-medium text-gray-600">Type</th>
                    <th className="py-2 px-4 text-left font-medium text-gray-600">Count</th>
                    <th className="py-2 px-4 text-left font-medium text-gray-600">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(nodesByType).map(([type, count]) => (
                    <tr key={type} className="border-b border-gray-100">
                      <td className="py-2 px-4 capitalize">{type}</td>
                      <td className="py-2 px-4">{count}</td>
                      <td className="py-2 px-4">{((count / map.nodes.length) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}