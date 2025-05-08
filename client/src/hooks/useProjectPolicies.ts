import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProjectPolicy {
  id: string;
  name: string;
  projectId: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useProjectPolicies(projectId?: string) {
  const queryClient = useQueryClient();
  
  // Query to fetch policies for the project
  const { 
    data: policies,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectPolicy[]>({
    queryKey: [`/api/projects/${projectId}/policies`],
    enabled: !!projectId,
  });
  
  // Mutation to create a new policy
  const createPolicyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/policies`, { name });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/policies`] });
    },
    onError: (error) => {
      console.error('Error creating policy:', error);
      throw error;
    }
  });
  
  // Mutation to update an existing policy
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ policyId, name }: { policyId: string, name: string }) => {
      const res = await apiRequest('PUT', `/api/projects/${projectId}/policies/${policyId}`, { name });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/policies`] });
    },
    onError: (error) => {
      console.error('Error updating policy:', error);
      throw error;
    }
  });
  
  // Mutation to delete a policy
  const deletePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/policies/${policyId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/policies`] });
      // Also invalidate the tasks since they reference policies
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
    },
    onError: (error) => {
      console.error('Error deleting policy:', error);
      throw error;
    }
  });
  
  // Convenience functions
  const createPolicy = async (name: string) => {
    return await createPolicyMutation.mutateAsync(name);
  };
  
  const updatePolicy = async (policyId: string, name: string) => {
    return await updatePolicyMutation.mutateAsync({ policyId, name });
  };
  
  const deletePolicy = async (policyId: string) => {
    return await deletePolicyMutation.mutateAsync(policyId);
  };
  
  return {
    policies,
    isLoading,
    error,
    refetch,
    createPolicy,
    updatePolicy,
    deletePolicy,
    isCreating: createPolicyMutation.isPending,
    isUpdating: updatePolicyMutation.isPending,
    isDeleting: deletePolicyMutation.isPending,
  };
}