import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

/**
 * Test component for UUID extraction
 * This is a simple test harness to verify our UUID extraction logic works consistently
 */
export default function UuidExtractionTest() {
  const [taskId, setTaskId] = useState('2f565bf9-70c7-5c41-93e7-c6c4cde32312-e253fe5a');
  const [extractedId, setExtractedId] = useState('');
  const { toast } = useToast();

  // Implement the same extraction logic as in useProjectTasks.ts
  function extractUuid(id: string): string {
    // Check if this appears to be a compound ID (contains more than 4 hyphens)
    const hyphenCount = (id.match(/-/g) || []).length;
    
    if (hyphenCount > 4) {
      // Standard UUID has 4 hyphens, extract just the UUID part (first 5 segments)
      const uuidParts = id.split('-');
      if (uuidParts.length >= 5) {
        const uuidOnly = uuidParts.slice(0, 5).join('-');
        return uuidOnly;
      }
    }
    
    // If not a compound ID or extraction failed, return the original
    return id;
  }

  const testExtraction = () => {
    try {
      const cleanId = extractUuid(taskId);
      setExtractedId(cleanId);
      
      // Log for TRACE_NET verification
      console.debug(`[TRACE_NET] Task update clean ID extraction:
  - Original task ID: ${taskId}
  - Cleaned UUID for API: ${cleanId}`);
      
      toast({
        title: 'UUID Extraction Test',
        description: `Extracted UUID: ${cleanId}`,
      });
    } catch (error) {
      console.error('Error extracting UUID:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract UUID',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-medium">UUID Extraction Test</h2>
      <p className="text-sm text-gray-500">
        Test the UUID extraction logic used for task updates
      </p>
      
      <div className="space-y-2">
        <Label htmlFor="task-id">Task ID (compound format)</Label>
        <Input 
          id="task-id"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="Enter task ID with suffix"
        />
      </div>
      
      <Button onClick={testExtraction}>Test Extraction</Button>
      
      {extractedId && (
        <div className="mt-4 space-y-2">
          <Label>Extracted UUID</Label>
          <div className="p-2 border rounded bg-gray-50">
            <Badge variant="outline" className="font-mono">
              {extractedId}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            This is the ID that will be used in API requests
          </p>
        </div>
      )}
    </div>
  );
}