import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import ForceGraph2D from 'react-force-graph-2d';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileJson, FileSpreadsheet, BarChart } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { toast } from '@/hooks/use-toast';

// Type definitions
interface GraphNode {
  id: string;
  label: string;
  type: 'factor' | 'task' | 'heuristic' | 'project' | 'unknown';
  isCentral?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  relType: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function GraphExplorer() {
  const [, navigate] = useLocation();
  const [projectId, setProjectId] = useState<string>('all_projects');
  const [relTypeFilter, setRelTypeFilter] = useState<string>('all');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<{[key: string]: boolean}>({
    relations: false,
    factorsJson: false,
    factorsCsv: false,
    factorsIntegrity: false
  });
  const { projects } = useProjects();
  const graphRef = useRef<any>(null);

  // Color map for node types
  const colorMap = {
    factor: '#21d19f', // teal
    task: '#f59e0b', // amber
    heuristic: '#3b82f6', // blue
    project: '#8b5cf6', // violet
    unknown: '#6b7280' // gray
  };

  // Fetch graph data
  const {
    data: graphData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<GraphData>({
    queryKey: [nodeId ? `/api/admin/graph/neighbours/${nodeId}` : '/api/admin/graph', projectId],
    queryFn: async () => {
      let url = nodeId
        ? `/api/admin/graph/neighbours/${nodeId}`
        : '/api/admin/graph';

      if (projectId && projectId !== 'all_projects') {
        url += `?projectId=${projectId}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        console.error('Error fetching graph data:', err);
        return { nodes: [], links: [] };
      }
    },
    enabled: true,
  });

  // Reset node selection when project changes
  useEffect(() => {
    setNodeId(null);
  }, [projectId]);

  // Filter graph data by relationship type
  const filteredGraphData = (): GraphData => {
    if (!graphData) return { nodes: [], links: [] };

    if (relTypeFilter === 'all') return graphData;

    const filteredLinks = graphData.links.filter(link => link.relType === relTypeFilter);
    
    // Get all nodes that are connected by the filtered links
    const connectedNodeIds = new Set<string>();
    filteredLinks.forEach(link => {
      if (typeof link.source === 'object' && link.source !== null) {
        connectedNodeIds.add((link.source as any).id);
      } else {
        connectedNodeIds.add(link.source as string);
      }
      if (typeof link.target === 'object' && link.target !== null) {
        connectedNodeIds.add((link.target as any).id);
      } else {
        connectedNodeIds.add(link.target as string);
      }
    });

    const filteredNodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  };

  // Get unique relation types for filter dropdown
  const getUniqueRelTypes = (): string[] => {
    if (!graphData?.links) return [];
    
    const types = new Set<string>();
    graphData.links.forEach(link => {
      types.add(link.relType);
    });
    
    return Array.from(types);
  };

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    // If already viewing this node's neighbors, reset to full graph view
    if (nodeId === node.id) {
      setNodeId(null);
    } else {
      setNodeId(node.id);
    }
  };

  const handleReset = () => {
    setNodeId(null);
    setProjectId('all_projects');
    setRelTypeFilter('all');
    // Center and zoom reset - assuming graphRef is available
    if (graphRef.current) {
      graphRef.current.zoomToFit(1000);
    }
  };

  // Warn about large graphs
  useEffect(() => {
    if (graphData && graphData.links.length > 5000) {
      console.warn(`Large graph with ${graphData.links.length} links. Consider filtering by project.`);
    }
  }, [graphData]);
  
  // Export relations data
  const exportRelations = async () => {
    try {
      setExportLoading(prev => ({ ...prev, relations: true }));
      
      // Build the URL with optional project filter
      let url = '/api/admin/relations-export';
      if (projectId && projectId !== 'all_projects') {
        url += `?projectId=${projectId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to export relations: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Create file download
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);
      
      // Create and trigger download link
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `relations-export${projectId !== 'all_projects' ? `-${projectId}` : ''}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "Export Successful",
        description: `${data.length} relations exported to JSON`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting relations:', error);
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(prev => ({ ...prev, relations: false }));
    }
  };
  
  // Export success factors
  const exportSuccessFactors = async (format: 'json' | 'csv') => {
    try {
      setExportLoading(prev => ({ 
        ...prev, 
        [format === 'json' ? 'factorsJson' : 'factorsCsv']: true 
      }));
      
      // Use the new factors-export endpoint
      const url = `/api/admin/factors-export?format=${format}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to export success factors: ${response.statusText}`);
      }
      
      // Get the data as text for CSV or JSON for json format
      let data;
      let fileName;
      let mimeType;
      
      if (format === 'csv') {
        data = await response.text();
        fileName = 'success-factors-export.csv';
        mimeType = 'text/csv';
      } else {
        data = await response.json();
        data = JSON.stringify(data, null, 2);
        fileName = 'success-factors-export.json';
        mimeType = 'application/json';
      }
      
      // Create file download
      const dataBlob = new Blob([data], { type: mimeType });
      const dataUrl = URL.createObjectURL(dataBlob);
      
      // Create and trigger download link
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "Export Successful",
        description: `Success factors exported to ${format.toUpperCase()}`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Error exporting success factors as ${format}:`, error);
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(prev => ({ 
        ...prev, 
        [format === 'json' ? 'factorsJson' : 'factorsCsv']: false 
      }));
    }
  };
  
  // Get success factors integrity report
  const getFactorsIntegrityReport = async () => {
    try {
      setExportLoading(prev => ({ ...prev, factorsIntegrity: true }));
      
      // Use the factors-integrity endpoint
      const response = await fetch('/api/admin/factors-integrity');
      if (!response.ok) {
        throw new Error(`Failed to get factors integrity report: ${response.statusText}`);
      }
      
      const report = await response.json();
      
      // Create formatted report text
      const reportStr = JSON.stringify(report, null, 2);
      const reportBlob = new Blob([reportStr], { type: 'application/json' });
      const reportUrl = URL.createObjectURL(reportBlob);
      
      // Create and trigger download link
      const downloadLink = document.createElement('a');
      downloadLink.href = reportUrl;
      downloadLink.download = 'success-factors-integrity-report.json';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "Integrity Report Generated",
        description: `Factors: ${report.factorCount}, Tasks: ${Object.values(report.taskDistribution).reduce((a: any, b: any) => a + b, 0)}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error getting factors integrity report:', error);
      toast({
        title: "Report Generation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(prev => ({ ...prev, factorsIntegrity: false }));
    }
  };

  // Handle window resize to redraw the graph
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        const chargeForce = graphRef.current.d3Force('charge');
        if (chargeForce && typeof chargeForce.distanceMax === 'function') {
          chargeForce.distanceMax(500);
        }
        
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400);
          }
        }, 300);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Graph Explorer</h1>
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
          Error loading graph data: {(error as Error).message}
        </div>
        <Button onClick={() => navigate('/make-a-plan/admin')}>Back to Admin</Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Relations Graph Explorer</h1>
        <Button onClick={() => navigate('/make-a-plan/admin')}>Back to Admin</Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Graph Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Filter</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_projects">All Projects</SelectItem>
                  {projects && projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Relationship Type</label>
              <Select value={relTypeFilter} onValueChange={setRelTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Relationships" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Relationships</SelectItem>
                  {getUniqueRelTypes().map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Reset View
              </Button>
              <Button onClick={() => refetch()} variant="outline" className="flex-1">
                Refresh Data
              </Button>
            </div>
          </div>

          {nodeId && (
            <div className="mt-4 p-3 bg-primary/10 rounded-md">
              <p className="text-sm">
                <strong>Focused on:</strong> {nodeId}
                <Button 
                  onClick={() => setNodeId(null)} 
                  variant="link" 
                  className="ml-2 p-0 h-auto"
                >
                  (Clear Focus)
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-1">
          <div className="w-full h-[70vh] border rounded-md relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading graph data...</span>
              </div>
            ) : filteredGraphData().nodes.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredGraphData()}
                nodeLabel="label"
                linkLabel="relType"
                nodeColor={(node: any) => colorMap[node.type as keyof typeof colorMap] || colorMap.unknown}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkWidth={1.5}
                nodeRelSize={6}
                onNodeClick={handleNodeClick}
                cooldownTicks={100}
                onEngineStop={() => {
                  setTimeout(() => {
                    if (graphRef.current) {
                      graphRef.current.zoomToFit(400);
                    }
                  }, 500);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p>No graph data found with current filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-md font-semibold mb-2">Relations Data</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Export the relationships graph data as JSON for external analysis
                </p>
                <Button 
                  onClick={exportRelations} 
                  disabled={exportLoading.relations}
                  className="w-full"
                >
                  {exportLoading.relations ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
                  ) : (
                    <><FileJson className="mr-2 h-4 w-4" /> Export Relations JSON</>
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-semibold mb-2">Success Factors Data</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Export success factors data for backup or external processing
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportSuccessFactors('json')} 
                    disabled={exportLoading.factorsJson}
                    className="flex-1"
                    variant="outline"
                  >
                    {exportLoading.factorsJson ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
                    ) : (
                      <><FileJson className="mr-2 h-4 w-4" /> JSON</>
                    )}
                  </Button>
                  <Button 
                    onClick={() => exportSuccessFactors('csv')} 
                    disabled={exportLoading.factorsCsv}
                    className="flex-1"
                    variant="outline"
                  >
                    {exportLoading.factorsCsv ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
                    ) : (
                      <><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</>
                    )}
                  </Button>
                </div>
                <Button 
                  onClick={getFactorsIntegrityReport} 
                  disabled={exportLoading.factorsIntegrity}
                  className="w-full"
                  variant="secondary"
                >
                  {exportLoading.factorsIntegrity ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><BarChart className="mr-2 h-4 w-4" /> Integrity Report</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(colorMap).map(([type, color]) => (
              <div key={type} className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Nodes:</strong> Represent entities in the system (factors, tasks, projects, etc.)
            </p>
            <p>
              <strong>Links:</strong> Represent relationships between entities
            </p>
            <p>
              <strong>Interaction:</strong> Click on a node to see its immediate connections. Click it again to return to full view.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}