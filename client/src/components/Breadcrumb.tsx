import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Crumb {
  href: string;
  label: string;
}

/**
 * Breadcrumb component that shows the current navigation path
 * Computes breadcrumbs directly during render based on current URL
 */
export function Breadcrumb() {
  const [location] = useLocation();
  
  // Extract IDs from path
  const pathParts = location.split('/').filter(Boolean);
  
  // Determine orgId and projectId based on URL structure
  let orgId: string | undefined = undefined;
  let projectId: string | undefined = undefined;
  
  const orgIndex = pathParts.indexOf('organisations');
  if (orgIndex !== -1 && orgIndex + 1 < pathParts.length) {
    orgId = pathParts[orgIndex + 1];
  }
  
  const projIndex = pathParts.indexOf('projects');
  if (projIndex !== -1 && projIndex + 1 < pathParts.length) {
    projectId = pathParts[projIndex + 1];
  }
  
  // Check for project in make-a-plan routes
  const planIndex = pathParts.indexOf('make-a-plan');
  if (planIndex !== -1 && planIndex + 1 < pathParts.length && !pathParts[planIndex + 1].includes('block') && pathParts[planIndex + 1] !== 'full') {
    projectId = pathParts[planIndex + 1];
  }
  
  // Fallback to localStorage for orgId if not in URL
  if (!orgId && projectId) {
    const storedOrgId = localStorage.getItem('currentOrgId');
    if (storedOrgId) {
      orgId = storedOrgId;
    }
  }
  
  // Fetch organization data
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organisation", orgId],
    queryFn: () => apiRequest("GET", `/api/organisations/${orgId}`).then(r => r.json()),
    enabled: !!orgId,
  });
  
  // Fetch project data
  const { data: proj, isLoading: projLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}`).then(r => r.json()),
    enabled: !!projectId,
  });
  
  // Build breadcrumb trail
  const crumbs: Crumb[] = [
    { href: "/", label: "Home" },
  ];
  
  // Add Organizations link when relevant
  if (pathParts.includes('organisations')) {
    crumbs.push({ href: "/organisations", label: "Organisations" });
    
    if (orgId) {
      crumbs.push({
        href: `/organisations/${orgId}`,
        label: orgLoading ? orgId : (org?.name || orgId)
      });
    }
  }
  
  // Add Project link when relevant
  if (projectId) {
    const projectUrl = orgId 
      ? `/organisations/${orgId}/projects/${projectId}` 
      : `/projects/${projectId}`;
      
    crumbs.push({
      href: projectUrl,
      label: projLoading ? projectId : (proj?.name || projectId)
    });
  }
  
  // Add tool-specific breadcrumbs
  if (location.includes("/goal-mapping")) {
    crumbs.push({ href: "", label: "Goal Mapping" });
  } else if (location.includes("/cynefin-orientation")) {
    crumbs.push({ href: "", label: "Cynefin Orientation" });
  } else if (location.includes("/tcof-journey")) {
    crumbs.push({ href: "", label: "TCOF Journey" });
  } else if (location.includes("/make-a-plan")) {
    if (!location.includes("/block-")) {
      crumbs.push({ href: "", label: "Make a Plan" });
    } else {
      crumbs.push({ 
        href: projectId ? `/make-a-plan/${projectId}` : "/make-a-plan", 
        label: "Make a Plan" 
      });
      
      // Add block info
      if (location.includes("/block-1")) {
        crumbs.push({ href: "", label: "Block 1: Discover" });
      } else if (location.includes("/block-2")) {
        crumbs.push({ href: "", label: "Block 2: Design" });
      } else if (location.includes("/block-3")) {
        crumbs.push({ href: "", label: "Block 3: Deliver" });
      }
    }
  } else if (location.includes("/profile/edit") || location.includes("/edit-basic")) {
    crumbs.push({ href: "", label: "Edit Profile" });
  } else if (location.includes("/settings")) {
    crumbs.push({ href: "/settings", label: "Settings" });
  }
  
  // Get current params via hook
  const params = useParams();
  
  // Debug logging
  console.log("🔄 Breadcrumb render — location:", location, "params:", params);
  console.log("📋 Computed crumbs:", crumbs);
  console.log("🔍 Org/Project IDs:", { orgId, projectId });
  console.log("📊 Data from API:", { org, proj });

  return (
    <nav aria-label="Breadcrumb" style={{ background: '#f3f4f6', padding: '8px', margin: '4px 0', border: '1px dashed #ccc' }}>
      {crumbs.map((crumb, idx) => (
        <span key={`${crumb.href}-${idx}-${location}`} className="flex items-center">
          <Link
            href={crumb.href || location}
            className={idx === crumbs.length - 1 ? "font-medium text-tcof-dark" : "hover:text-tcof-teal"}
            aria-current={idx === crumbs.length - 1 ? "page" : undefined}
          >
            {idx === 0 ? (
              <span className="flex items-center">
                <Home className="inline h-4 w-4" />
                <span className="sr-only">Home</span>
              </span>
            ) : (
              crumb.label
            )}
          </Link>
          {idx < crumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
          )}
        </span>
      ))}
    </nav>
  );
}