import { useParams, Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function Breadcrumb() {
  // Get the parameters from the current URL
  const { orgId, projectId } = useParams<{ 
    orgId?: string;
    projectId?: string;
  }>();

  // Get the current path segments for highlighting the current page
  const path = window.location.pathname;
  const isProfileEdit = path.includes('/profile/edit');

  // Fetch organisation name if orgId is present
  const { data: organisation } = useQuery({
    queryKey: ['organisation', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const res = await apiRequest('GET', `/api/organisations/${orgId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId
  });

  // Fetch project name if projectId is present
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectId
  });

  return (
    <div className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto">
      <Link href="/" className="flex items-center hover:text-tcof-teal">
        <Home className="h-4 w-4" />
      </Link>
      
      <ChevronRight className="h-4 w-4 mx-1" />
      
      <Link 
        href="/organisations" 
        className="hover:text-tcof-teal"
      >
        Organisations
      </Link>
      
      {orgId && organisation && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link 
            href={`/organisations/${orgId}`}
            className={`font-medium ${!projectId ? 'text-tcof-dark' : 'hover:text-tcof-teal'}`}
          >
            {organisation.name}
          </Link>
        </>
      )}
      
      {projectId && project && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link 
            href={`/organisations/${orgId}/projects/${projectId}`}
            className={`font-medium ${!isProfileEdit ? 'text-tcof-dark' : 'hover:text-tcof-teal'}`}
          >
            {project.name}
          </Link>
        </>
      )}
      
      {isProfileEdit && (
        <>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link 
            href={`/organisations/${orgId}/projects/${projectId}/profile/edit`}
            className="font-medium text-tcof-dark"
          >
            Profile
          </Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="font-medium text-tcof-dark">Edit</span>
        </>
      )}
    </div>
  );
}