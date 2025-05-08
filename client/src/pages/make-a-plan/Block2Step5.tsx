import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StepNavigation from '@/components/StepNavigation';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useToolProgress } from '@/hooks/useToolProgress';
import { usePolicyTasks } from '@/hooks/usePolicyTasks';
import { EditableTaskPanel, StageType } from '@/components/task/EditableTaskPanel';

export default function Block2Step5() {
  const { projectId } = useParams();
  const { toast } = useToast();
  
  // Get the project name
  const { currentProject } = useProjectContext();
  
  // Tool progress tracking
  const { updateToolProgress } = useToolProgress();
  
  // Use our custom hook for policy tasks
  const {
    policies,
    selectedPolicyId,
    setSelectedPolicyId,
    formattedTasks,
    isLoading,
    isSaving,
    isPolicySaving,
    saveStatus,
    handleSaveTask,
    handleAddTask,
    handleDeleteTask,
    newPolicyName,
    setNewPolicyName,
    createPolicy,
    updatePolicy,
    deletePolicy
  } = usePolicyTasks(projectId);
  
  // State for editing policy name
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingPolicyName, setEditingPolicyName] = useState('');

  // Handle creating a new policy
  const handleCreatePolicy = async () => {
    if (!newPolicyName.trim()) {
      toast({
        title: "Policy name required",
        description: "Please enter a name for your policy",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createPolicy(newPolicyName);
      toast({
        title: "Policy created",
        description: `"${newPolicyName}" policy has been created successfully.`,
      });
      setNewPolicyName('');
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error creating policy",
        description: "There was an error creating your policy. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle starting edit mode for policy name
  const handleStartEditPolicy = (policyId: string, currentName: string) => {
    setEditingPolicyId(policyId);
    setEditingPolicyName(currentName);
  };
  
  // Handle saving policy name edit
  const handleSaveEditPolicy = async () => {
    if (!editingPolicyId || !editingPolicyName.trim()) return;
    
    try {
      await updatePolicy(editingPolicyId, editingPolicyName);
      toast({
        title: "Policy updated",
        description: "Policy name has been updated successfully",
      });
      setEditingPolicyId(null);
    } catch (error) {
      console.error('Error updating policy:', error);
      toast({
        title: "Error updating policy",
        description: "There was an error updating the policy name",
        variant: "destructive",
      });
    }
  };
  
  // Handle canceling policy name edit
  const handleCancelEditPolicy = () => {
    setEditingPolicyId(null);
  };
  
  // Handle deleting a policy
  const handleDeletePolicy = async (policyId: string, policyName: string) => {
    if (window.confirm(`Are you sure you want to delete the policy "${policyName}"? This will also delete all associated tasks.`)) {
      try {
        await deletePolicy(policyId);
        
        // If the deleted policy was selected, clear selection
        if (selectedPolicyId === policyId) {
          setSelectedPolicyId(null);
        }
        
        toast({
          title: "Policy deleted",
          description: `"${policyName}" policy has been deleted successfully.`,
        });
      } catch (error) {
        console.error('Error deleting policy:', error);
        toast({
          title: "Error deleting policy",
          description: "There was an error deleting the policy",
          variant: "destructive",
        });
      }
    }
  };
  
  // When complete, update progress
  const handleComplete = async () => {
    if (projectId) {
      await updateToolProgress(projectId, 'make-a-plan', 'block-2-step-5', { completed: true });
      toast({
        title: "Progress saved",
        description: "Your progress has been saved successfully",
      });
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <MakeAPlanLayout
        title="Create policy-specific tasks"
        description="Define organizational policies and create tasks for each policy."
        currentStep={5}
        block={2}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading your policies and tasks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }
  
  return (
    <MakeAPlanLayout
      title="Create policy-specific tasks"
      description="Define organizational policies and create tasks for each policy."
      currentStep={5}
      block={2}
    >
      <div className="space-y-6">
        {/* Policy creation card */}
        <Card>
          <CardHeader>
            <CardTitle>Organizational Policies</CardTitle>
            <CardDescription>
              Create organization-specific policies and add tasks for each policy.
              You can add up to 3 tasks per project stage for each policy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-6">
              {/* Policy list panel */}
              <div className="col-span-12 md:col-span-4">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-md">Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Policy list */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {policies.length > 0 ? (
                        policies.map(policy => (
                          <div 
                            key={policy.id}
                            className={`relative border p-3 rounded-md group hover:bg-gray-50 ${
                              selectedPolicyId === policy.id ? 'border-tcof-teal bg-tcof-teal/10' : 'border-gray-200'
                            }`}
                          >
                            {editingPolicyId === policy.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingPolicyName}
                                  onChange={e => setEditingPolicyName(e.target.value)}
                                  autoFocus
                                  className="flex-1"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditPolicy();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditPolicy();
                                    }
                                  }}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={handleCancelEditPolicy}
                                  className="h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div 
                                  className="cursor-pointer pr-16 font-medium"
                                  onClick={() => setSelectedPolicyId(policy.id)}
                                >
                                  {policy.name}
                                </div>
                                <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleStartEditPolicy(policy.id, policy.name)}
                                  >
                                    <span className="sr-only">Edit</span>
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500"
                                    onClick={() => handleDeletePolicy(policy.id, policy.name)}
                                  >
                                    <span className="sr-only">Delete</span>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                          No policies created yet. Add your first policy below.
                        </div>
                      )}
                    </div>
                    
                    {/* Add new policy */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="New policy name..."
                          value={newPolicyName}
                          onChange={e => setNewPolicyName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreatePolicy();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleCreatePolicy}
                          disabled={!newPolicyName.trim() || isPolicySaving}
                        >
                          {isPolicySaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Task editor panel */}
              <div className="col-span-12 md:col-span-8">
                {selectedPolicyId ? (
                  <EditableTaskPanel
                    title={`Tasks for ${policies.find(p => p.id === selectedPolicyId)?.name || 'Policy'}`}
                    description="Add up to 3 tasks per stage for this policy."
                    tasks={formattedTasks}
                    onSaveTask={handleSaveTask}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    isSaving={isSaving}
                    saveStatus={saveStatus}
                  />
                ) : (
                  <Card className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                    <div>
                      <p className="mb-2">Select a policy from the list to create tasks.</p>
                      <p className="text-sm">You can add up to 3 tasks per stage for each policy.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <StepNavigation
          prevLink={`/make-a-plan/${projectId}/block-2/step-4`}
          nextLink={`/make-a-plan/${projectId}/block-2/summary`}
          onComplete={handleComplete}
        />
      </div>
    </MakeAPlanLayout>
  );
}