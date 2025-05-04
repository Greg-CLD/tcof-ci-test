import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import ForceGraph2D from 'react-force-graph-2d';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

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
  const [projectId, setProjectId] = useState<string>('');
  const [relTypeFilter, setRelTypeFilter] = useState<string>('all');
  const [nodeId, setNodeId] = useState<string | null>(null);
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

      if (projectId) {
        url += `?projectId=${projectId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.statusText}`);
      }
      return response.json();
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
                  <SelectItem value="">All Projects</SelectItem>
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
                  if (graphRef.current) {
                    graphRef.current.zoomToFit(400);
                  }
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