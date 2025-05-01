import { useRef, useEffect, useState, useCallback } from 'react';
import { GoalNode, Connection } from '@/lib/storage';

interface UseCanvasProps {
  initialNodes?: GoalNode[];
  initialConnections?: Connection[];
  onNodeChange?: (nodes: GoalNode[]) => void;
  onConnectionChange?: (connections: Connection[]) => void;
}

export function useCanvas({
  initialNodes = [],
  initialConnections = [],
  onNodeChange,
  onConnectionChange
}: UseCanvasProps = {}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GoalNode[]>(initialNodes);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [drawingConnection, setDrawingConnection] = useState<{
    sourceId: string;
    x: number;
    y: number;
  } | null>(null);

  // Generate unique ID
  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2, 9);
  }, []);

  // Add a new node at specific coordinates
  const addNode = useCallback(
    (text: string, timeframe: string = '', x: number, y: number) => {
      const newNode: GoalNode = {
        id: generateId(),
        text,
        timeframe,
        x,
        y
      };
      
      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      onNodeChange?.(updatedNodes);
      return newNode.id;
    },
    [nodes, generateId, onNodeChange]
  );

  // Update node position
  const updateNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      const updatedNodes = nodes.map(node => {
        if (node.id === id) {
          return { ...node, x, y };
        }
        return node;
      });
      
      setNodes(updatedNodes);
      onNodeChange?.(updatedNodes);
    },
    [nodes, onNodeChange]
  );

  // Update node text
  const updateNodeText = useCallback(
    (id: string, text: string, timeframe: string = '') => {
      const updatedNodes = nodes.map(node => {
        if (node.id === id) {
          return { ...node, text, timeframe };
        }
        return node;
      });
      
      setNodes(updatedNodes);
      onNodeChange?.(updatedNodes);
    },
    [nodes, onNodeChange]
  );

  // Delete node and its connections
  const deleteNode = useCallback(
    (id: string) => {
      const updatedNodes = nodes.filter(node => node.id !== id);
      setNodes(updatedNodes);
      onNodeChange?.(updatedNodes);
      
      const updatedConnections = connections.filter(
        conn => conn.sourceId !== id && conn.targetId !== id
      );
      setConnections(updatedConnections);
      onConnectionChange?.(updatedConnections);
    },
    [nodes, connections, onNodeChange, onConnectionChange]
  );

  // Add a connection between two nodes
  const addConnection = useCallback(
    (sourceId: string, targetId: string) => {
      // Don't connect a node to itself or create duplicate connections
      if (
        sourceId === targetId ||
        connections.some(
          conn => 
            (conn.sourceId === sourceId && conn.targetId === targetId) ||
            (conn.sourceId === targetId && conn.targetId === sourceId)
        )
      ) {
        return;
      }

      const newConnection: Connection = {
        id: generateId(),
        sourceId,
        targetId
      };
      
      const updatedConnections = [...connections, newConnection];
      setConnections(updatedConnections);
      onConnectionChange?.(updatedConnections);
    },
    [connections, generateId, onConnectionChange]
  );

  // Delete a connection
  const deleteConnection = useCallback(
    (id: string) => {
      const updatedConnections = connections.filter(conn => conn.id !== id);
      setConnections(updatedConnections);
      onConnectionChange?.(updatedConnections);
    },
    [connections, onConnectionChange]
  );

  // Clear all nodes and connections
  const clearCanvas = useCallback(() => {
    setNodes([]);
    setConnections([]);
    onNodeChange?.([]);
    onConnectionChange?.([]);
  }, [onNodeChange, onConnectionChange]);

  // Set up node dragging behavior
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.text-node') as HTMLElement;
      
      if (nodeElement) {
        const nodeId = nodeElement.dataset.id;
        if (nodeId) {
          setActiveNodeId(nodeId);
          
          // Prepare for potential connection drawing if clicking on a node
          const rect = nodeElement.getBoundingClientRect();
          const sourceX = rect.left + rect.width / 2;
          const sourceY = rect.top + rect.height / 2;
          
          setDrawingConnection({
            sourceId: nodeId,
            x: sourceX,
            y: sourceY
          });
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (activeNodeId) {
        const containerRect = container.getBoundingClientRect();
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;
        
        updateNodePosition(activeNodeId, x, y);
      }
      
      // Update temporary connection line if drawing
      if (drawingConnection) {
        setDrawingConnection({
          ...drawingConnection,
          x: e.clientX,
          y: e.clientY
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.text-node') as HTMLElement;
      
      // If we have a source node and released on a different target node, create connection
      if (drawingConnection && nodeElement) {
        const targetId = nodeElement.dataset.id;
        if (targetId && targetId !== drawingConnection.sourceId) {
          addConnection(drawingConnection.sourceId, targetId);
        }
      }
      
      setActiveNodeId(null);
      setDrawingConnection(null);
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeNodeId, drawingConnection, updateNodePosition, addConnection]);

  return {
    canvasRef,
    svgRef,
    nodes,
    connections,
    addNode,
    updateNodePosition,
    updateNodeText,
    deleteNode,
    addConnection,
    deleteConnection,
    clearCanvas,
    activeNodeId,
    drawingConnection
  };
}
