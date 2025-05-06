import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function Breadcrumb() {
  const [location] = useLocation();
  const params = useParams();
  const orgId = params?.orgId;
  const projectId = params?.projectId;

  // Fetch organisation name if orgId is present
  const { data: organisation } = useQuery({
    queryKey: ['/api/organisations', orgId],
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
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectId
  });

  // Build a single array of crumb segments
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/organisations", label: "Organisations" },
  ];

  if (orgId) {
    crumbs.push({
      href: `/organisations/${orgId}`,
      // Use actual org name if available, fallback to static name
      label: organisation?.name || "Confluity Test Org", 
    });
  }

  if (projectId) {
    crumbs.push({
      href: `/organisations/${orgId}/projects/${projectId}`,
      // Use actual project name if available, fallback to ID
      label: project?.name || `Project ${projectId}`, 
    });
  }

  // Check for additional sub-pages
  if (location.endsWith("/profile/edit")) {
    crumbs.push({ href: "", label: "Edit" });
  } else if (location.endsWith("/edit-basic")) {
    crumbs.push({ href: "", label: "Edit Details" });
  }

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href || idx} className="flex items-center">
          <Link
            href={crumb.href || location}
            className={`hover:text-tcof-teal ${
              idx === crumbs.length - 1 ? "font-medium text-tcof-dark" : ""
            }`}
          >
            {idx === 0 ? <Home className="inline h-4 w-4" /> : crumb.label}
          </Link>
          {idx < crumbs.length - 1 && <ChevronRight className="h-4 w-4 mx-1" />}
        </span>
      ))}
    </nav>
  );
}