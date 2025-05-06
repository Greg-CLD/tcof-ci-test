import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Component ID to identify this instance of Breadcrumb in logs
const COMPONENT_ID = "Breadcrumb-" + Math.random().toString(36).substring(2, 9);

// Define interface for Organisation and Project types to fix type errors
interface Organisation {
  id: string;
  name: string;
  description?: string | null;
  role?: 'owner' | 'admin' | 'member';
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  organisationId?: string;
}

export function Breadcrumb() {
  const [location] = useLocation();
  const params = useParams();
  const orgId = params?.orgId;
  const projectId = params?.projectId;
  
  console.log(`[${COMPONENT_ID}] Rendering with params:`, { orgId, projectId, location });

  // Fetch organisation name if orgId is present
  const { data: organisation, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['/api/organisations', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      console.log(`[${COMPONENT_ID}] Fetching organisation:`, orgId);
      const res = await apiRequest('GET', `/api/organisations/${orgId}`);
      if (!res.ok) {
        console.error(`[${COMPONENT_ID}] Error fetching organisation:`, orgId, await res.text());
        return null;
      }
      const data = await res.json();
      console.log(`[${COMPONENT_ID}] Got organisation:`, data);
      return data as Organisation;
    },
    enabled: !!orgId,
    staleTime: 60000 // Cache for 1 minute
  });

  // Fetch project name if projectId is present
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      console.log(`[${COMPONENT_ID}] Fetching project:`, projectId);
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      if (!res.ok) {
        console.error(`[${COMPONENT_ID}] Error fetching project:`, projectId, await res.text());
        return null;
      }
      const data = await res.json();
      console.log(`[${COMPONENT_ID}] Got project:`, data);
      return data as Project;
    },
    enabled: !!projectId,
    staleTime: 60000 // Cache for 1 minute
  });

  // Build a single array of crumb segments
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/organisations", label: "Organisations" },
  ];

  if (orgId) {
    crumbs.push({
      href: `/organisations/${orgId}`,
      // Use actual org name if available, fallback to "Loading..." or "Organisation"
      label: orgLoading 
        ? "Loading..." 
        : (organisation?.name || (orgError ? "Organisation" : "Loading Organisation")), 
    });
  }

  if (projectId) {
    crumbs.push({
      href: `/organisations/${orgId}/projects/${projectId}`,
      // Use actual project name if available, fallback to "Loading..." or "Project"
      label: projectLoading 
        ? "Loading..." 
        : (project?.name || (projectError ? `Project ${projectId}` : "Loading Project")),
    });
  }

  // Check for additional sub-pages
  if (location.endsWith("/profile/edit")) {
    crumbs.push({ href: "", label: "Edit Profile" });
  } else if (location.endsWith("/edit-basic")) {
    crumbs.push({ href: "", label: "Edit Details" });
  } else if (location.includes("/tools/goal-mapping")) {
    crumbs.push({ href: "", label: "Goal Mapping Tool" });
  } else if (location.includes("/tools/cynefin-orientation")) {
    crumbs.push({ href: "", label: "Cynefin Tool" });
  } else if (location.includes("/tools/tcof-journey")) {
    crumbs.push({ href: "", label: "TCOF Journey Tool" });
  } else if (location.includes("/make-a-plan")) {
    crumbs.push({ href: "", label: "Make a Plan" });
  }

  console.log(`[${COMPONENT_ID}] Generated crumbs:`, crumbs);

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto px-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href || idx} className="flex items-center">
          <Link
            href={crumb.href || location}
            className={`hover:text-tcof-teal ${
              idx === crumbs.length - 1 ? "font-medium text-tcof-dark" : ""
            }`}
            aria-current={idx === crumbs.length - 1 ? "page" : undefined}
          >
            {idx === 0 ? (
              <Home className="inline h-4 w-4" aria-hidden="true" />
            ) : (
              <span>{crumb.label}</span>
            )}
            {idx === 0 && <span className="sr-only">Home</span>}
          </Link>
          {idx < crumbs.length - 1 && <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />}
        </span>
      ))}
    </nav>
  );
}