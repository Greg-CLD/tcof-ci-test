import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { v4 as uuidv4 } from 'uuid';

// This component tests the UUID warning fixes by directly using the useProjectTasks hook
export default function UuidWarningTester({ projectId }: { projectId: string }) {
  const [sourceId, setSourceId] = useState<string>('');
  const { toast } = useToast();
  const { createTask } = useProjectTasks(projectId);
  
  const testWithValidUuid = async () => {
    const validUuid = uuidv4();
    console.log('Testing with valid UUID:', validUuid);
    
    try {
      const task = await createTask({
        projectId,
        text: `Valid UUID Test: ${new Date().toISOString()}`,
        stage: 'identification',
        origin: 'custom',
        sourceId: validUuid,
        priority: 'medium',
        notes: 'Created from UUID warning test component'
      });
      
      console.log('Task created with valid UUID:', task);
      toast({
        title: 'Success',
        description: `Task created with valid UUID (check console)`,
      });
    } catch (err) {
      console.error('Error creating task with valid UUID:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task with valid UUID',
        variant: 'destructive'
      });
    }
  };
  
  const testWithInvalidUuid = async () => {
    const invalidUuid = 'not-a-valid-uuid-format';
    console.log('Testing with invalid UUID:', invalidUuid);
    
    try {
      const task = await createTask({
        projectId,
        text: `Invalid UUID Test: ${new Date().toISOString()}`,
        stage: 'identification',
        origin: 'custom',
        sourceId: invalidUuid,
        priority: 'medium',
        notes: 'Created from UUID warning test component'
      });
      
      console.log('Task created with invalid UUID:', task);
      toast({
        title: 'Success',
        description: 'Task created with invalid UUID (check console)',
      });
    } catch (err) {
      console.error('Error creating task with invalid UUID:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task with invalid UUID',
        variant: 'destructive'
      });
    }
  };
  
  const testWithCustomUuid = async () => {
    console.log('Testing with custom value:', sourceId);
    
    try {
      const task = await createTask({
        projectId,
        text: `Custom UUID Test: ${new Date().toISOString()}`,
        stage: 'identification',
        origin: 'custom',
        sourceId: sourceId || null, // Allow empty string to be null
        priority: 'medium',
        notes: 'Created from UUID warning test component'
      });
      
      console.log('Task created with custom UUID:', task);
      toast({
        title: 'Success',
        description: 'Task created with custom UUID (check console)',
      });
    } catch (err) {
      console.error('Error creating task with custom UUID:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task with custom UUID',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      <h3 className="text-lg font-semibold mb-2">UUID Warning Fix Tester</h3>
      <p className="text-sm text-gray-500 mb-4">
        Test the UUID warning fix by creating tasks with different sourceId formats. 
        Check your browser console for logs.
      </p>
      
      <div className="space-y-4">
        <div>
          <Button 
            onClick={testWithValidUuid}
            className="mr-2"
          >
            Test Valid UUID
          </Button>
          <Button 
            onClick={testWithInvalidUuid}
            variant="secondary"
          >
            Test Invalid UUID
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Input 
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="Enter a custom sourceId"
            className="flex-1"
          />
          <Button onClick={testWithCustomUuid}>Test Custom Value</Button>
        </div>
      </div>
    </div>
  );
}