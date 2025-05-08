import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProjectPolicy {
  id: string;
  name: string;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CreatePolicyParams {
  name: string;
}

export function useProjectPolicies(projectId?: string) {
  const queryClient = useQueryClient();
  const [newPolicyName, setNewPolicyName] = useState('');

  // Fetch policies for the project
  const {
    data: policies = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/projects', projectId, 'policies'],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiRequest('GET', `/api/projects/${projectId}/policies`);
      return await response.json();
    },
    enabled: !!projectId
  });

  // Create a new policy
  const createPolicyMutation = useMutation({
    mutationFn: async (data: CreatePolicyParams) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/policies`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'policies'] });
      setNewPolicyName('');
    }
  });

  // Update an existing policy
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ policyId, name }: { policyId: string; name: string }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/policies/${policyId}`, { name });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'policies'] });
    }
  });

  // Delete a policy
  const deletePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/policies/${policyId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'policies'] });
      // Also invalidate tasks since deleting a policy removes its tasks
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
    }
  });

  // Helper function to handle policy creation
  const createPolicy = async (name: string) => {
    if (!name.trim() || !projectId) return null;
    return await createPolicyMutation.mutateAsync({ name });
  };

  // Helper function to handle policy update
  const updatePolicy = async (policyId: string, name: string) => {
    if (!name.trim() || !projectId || !policyId) return null;
    return await updatePolicyMutation.mutateAsync({ policyId, name });
  };

  // Helper function to handle policy deletion
  const deletePolicy = async (policyId: string): Promise<void> => {
    if (!projectId || !policyId) return;
    await deletePolicyMutation.mutateAsync(policyId);
  };

  return {
    policies,
    isLoading,
    error,
    newPolicyName,
    setNewPolicyName,
    createPolicy,
    updatePolicy,
    deletePolicy,
    isSaving: createPolicyMutation.isPending || updatePolicyMutation.isPending || deletePolicyMutation.isPending
  };
}