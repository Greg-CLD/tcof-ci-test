import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FactorTaskEditor, { StageType } from './FactorTaskEditor';

interface OrgPolicy {
  id: string;
  title: string;
  tasks: Record<StageType, string[]>;
}

interface OrgPoliciesProps {
  planId: string;
  policies: OrgPolicy[];
  onAddPolicy: (title: string) => void;
  onUpdatePolicy: (policyId: string, title: string) => void;
  onDeletePolicy: (policyId: string) => void;
  onAddTask: (policyId: string, stage: StageType) => void;
  onUpdateTask: (policyId: string, stage: StageType, taskIndex: number, newText: string) => void;
  onDeleteTask: (policyId: string, stage: StageType, taskIndex: number) => void;
}

export default function OrgPolicies({
  planId,
  policies,
  onAddPolicy,
  onUpdatePolicy,
  onDeletePolicy,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: OrgPoliciesProps) {
  const [newPolicyTitle, setNewPolicyTitle] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const { toast } = useToast();

  // Select the first policy by default or when policies change
  useEffect(() => {
    if (policies.length > 0 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id);
    } else if (policies.length === 0) {
      setSelectedPolicyId(null);
    }
  }, [policies, selectedPolicyId]);

  const handleAddPolicy = () => {
    if (!newPolicyTitle.trim()) {
      toast({
        title: 'Missing policy title',
        description: 'Please enter a title for the new policy.',
        variant: 'destructive'
      });
      return;
    }

    onAddPolicy(newPolicyTitle);
    setNewPolicyTitle('');
    toast({
      title: 'Policy added',
      description: `"${newPolicyTitle}" has been added.`,
      variant: 'default'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Step 5: Organizational Policies</CardTitle>
        <CardDescription>
          Define organizational policies and associated tasks for your project.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Create New Policy Section */}
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-md font-medium mb-2">Create New Policy Group</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Policy title e.g. Change Process"
                value={newPolicyTitle}
                onChange={(e) => setNewPolicyTitle(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddPolicy}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {policies.length > 0 ? (
            <FactorTaskEditor
              items={policies}
              selectedItemId={selectedPolicyId}
              title="Define Policy Tasks"
              description="Add tasks for each selected policy by project stage."
              tasks={selectedPolicyId ? 
                policies.find(p => p.id === selectedPolicyId)?.tasks || {
                  Identification: [],
                  Definition: [],
                  Delivery: [],
                  Closure: []
                } : {
                  Identification: [],
                  Definition: [],
                  Delivery: [],
                  Closure: []
                }
              }
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSelectItem={setSelectedPolicyId}
              isAutoSaving={true}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
              No policy groups defined yet. Create your first policy above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}