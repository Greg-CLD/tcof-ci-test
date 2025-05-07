import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Crumb {
  href: string;
  label: string;
  isActive?: boolean;
}

// URL segment to display name mapping
const SEGMENT_LABELS: Record<string, string> = {
  'organisations': 'Organisations',
  'all-projects': 'All Projects',
  'projects': 'Projects',
  'goal-mapping': 'Goal Mapping',
  'cynefin-orientation': 'Cynefin Orientation',
  'tcof-journey': 'TCOF Journey',
  'make-a-plan': 'Make a Plan',
  'block-1': 'Block 1: Discover',
  'block-2': 'Block 2: Design',
  'block-3': 'Block 3: Deliver',
  'checklist': 'Checklist', 
  'settings': 'Settings',
  'profile': 'Profile',
  'admin': 'Admin'
};

/**
 * Breadcrumb component that dynamically shows the current navigation path
 * Computes breadcrumbs during render based on current URL
 */
export function Breadcrumb() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Extract path segments for route building
  const pathSegments = location.split('/').filter(Boolean);
  
  // Extract entity IDs from the URL path
  const orgId = useMemo(() => {
    const orgIndex = pathSegments.indexOf('organisations');
    return orgIndex !== -1 && orgIndex + 1 < pathSegments.length ? pathSegments[orgIndex + 1] : undefined;
  }, [pathSegments]);
  
  const projectId = useMemo(() => {
    // Check for project ID in standard paths
    const projIndex = pathSegments.indexOf('projects');
    if (projIndex !== -1 && projIndex + 1 < pathSegments.length) {
      return pathSegments[projIndex + 1];
    }
    
    // Check for project ID in make-a-plan routes
    const planIndex = pathSegments.indexOf('make-a-plan');
    if (planIndex !== -1 && planIndex + 1 < pathSegments.length && 
        !pathSegments[planIndex + 1].includes('block') && 
        pathSegments[planIndex + 1] !== 'full' &&
        pathSegments[planIndex + 1] !== 'checklist') {
      return pathSegments[planIndex + 1];
    }
    
    return undefined;
  }, [pathSegments]);
  
  // Fetch organization data from API if we have an ID
  const { data: org } = useQuery({
    queryKey: ["organisation", orgId],
    queryFn: () => apiRequest("GET", `/api/organisations/${orgId}`).then(r => r.json()),
    enabled: !!orgId,
  });
  
  // Fetch project data from API if we have an ID
  const { data: proj } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}`).then(r => r.json()),
    enabled: !!projectId,
  });

  // Generate dynamic breadcrumbs based on current URL
  const crumbs = useMemo(() => {
    const result: Crumb[] = [];
    
    // Only add Home crumb for unauthenticated users or on the home page
    if (!user || location === '/') {
      result.push({ href: "/", label: "Home" });
    }
    
    let currentPath = "";
    
    // Build breadcrumb trail by walking through path segments
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      
      // Skip IDs for cleaner breadcrumb display
      if (i > 0 && segment === orgId && pathSegments[i-1] === 'organisations') {
        // Add organization with its fetched name
        result.push({
          href: currentPath,
          label: org?.name || 'Organization'
        });
        continue;
      }
      
      if (i > 0 && segment === projectId && 
          (pathSegments[i-1] === 'projects' || pathSegments[i-1] === 'make-a-plan')) {
        // Add project with its fetched name
        result.push({
          href: currentPath,
          label: proj?.name || 'Project'
        });
        continue;
      }
      
      // Handle special cases for block pages in make-a-plan
      if (segment.startsWith('block-') && pathSegments.includes('make-a-plan')) {
        // For block pages, add make-a-plan root first if not already added
        if (!result.some(crumb => crumb.label === 'Make a Plan')) {
          const planPath = projectId 
            ? `/make-a-plan/${projectId}` 
            : '/make-a-plan';
          
          result.push({
            href: planPath,
            label: 'Make a Plan'
          });
        }
        
        // Then add the block crumb
        result.push({
          href: currentPath,
          label: SEGMENT_LABELS[segment] || segment,
          isActive: i === pathSegments.length - 1
        });
        continue;
      }
      
      // For standard URL segments, add the translated label
      if (SEGMENT_LABELS[segment]) {
        result.push({
          href: currentPath,
          label: SEGMENT_LABELS[segment],
          isActive: i === pathSegments.length - 1
        });
      }
    }
    
    // Mark the last crumb as active
    if (result.length > 0) {
      result[result.length - 1].isActive = true;
    }
    
    return result;
  }, [pathSegments, orgId, projectId, org, proj, user, location]);
  
  // Debug logging for development
  console.log("🧭 Breadcrumb segments:", pathSegments);
  console.log("🔍 Org/Project IDs:", { orgId, projectId });
  console.log("📋 Computed crumbs:", crumbs);

  return (
    <nav aria-label="Breadcrumb" style={{ 
      background: 'linear-gradient(to right, #e6f7ff, #f0f9ff)', 
      padding: '10px 12px', 
      margin: '6px 0', 
      border: '1px solid #2196f3',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div className="flex items-center flex-wrap">
        {crumbs.map((crumb, idx) => (
          <span key={`${crumb.href}-${idx}-${location}`} className="flex items-center">
            <Link
              href={crumb.href || location}
              className={idx === crumbs.length - 1 
                ? "font-medium text-blue-800" 
                : "text-blue-600 hover:text-blue-900 hover:underline"}
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
              <ChevronRight className="h-4 w-4 mx-2 text-blue-400" aria-hidden="true" />
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}