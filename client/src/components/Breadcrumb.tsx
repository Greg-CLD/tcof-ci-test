import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Component ID to identify this instance of Breadcrumb in logs
const COMPONENT_ID = "Breadcrumb-" + Math.random().toString(36).substring(2, 9);

interface Organisation { id: string; name: string; }
interface Project      { id: string; name: string; }

export function Breadcrumb() {
  const [location] = useLocation();
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();
  
  console.log(`[${COMPONENT_ID}] Rendering breadcrumb with:`, { location, orgId, projectId });
  console.log(`[${COMPONENT_ID}] URL params:`, useParams());
  // 1) Fetch organisation name if orgId is provided
  const { data: org, isLoading: orgLoading, isError: orgError } = useQuery({
    queryKey: ["organisation", orgId],
    queryFn: async () => {
      console.log(`[${COMPONENT_ID}] Fetching organisation:`, orgId);
      const res = await apiRequest("GET", `/api/organisations/${orgId}`);
      if (!res.ok) {
        console.error(`[${COMPONENT_ID}] Failed to load organisation:`, orgId, await res.text());
        throw new Error("Failed to load organisation");
      }
      const data = await res.json();
      console.log(`[${COMPONENT_ID}] Got organisation:`, data);
      return data as Organisation;
    },
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });

  // 2) Fetch project name if projectId is provided
  const { data: proj, isLoading: projLoading, isError: projError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      console.log(`[${COMPONENT_ID}] Fetching project:`, projectId);
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) {
        console.error(`[${COMPONENT_ID}] Failed to load project:`, projectId, await res.text());
        throw new Error("Failed to load project");
      }
      const data = await res.json();
      console.log(`[${COMPONENT_ID}] Got project:`, data);
      return data as Project;
    },
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  // 3) Build crumbs array
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    // Only add Organisations link if we're in that context
    ...(location.includes('/organisations') ? [{ href: "/organisations", label: "Organisations" }] : []),
    // only push the org crumb if orgId exists
    ...(
      orgId
        ? [{
            href: `/organisations/${orgId}`,
            label: orgLoading
              ? "Loading..."
              : orgError || !org
                ? "Unknown Org"
                : org.name
          }]
        : []
    ),
    // only push the project crumb if projectId exists
    ...(
      projectId
        ? [{
            href: `/organisations/${orgId}/projects/${projectId}`,
            label: projLoading
              ? "Loading..."
              : projError || !proj
                ? "Unknown Project"
                : proj.name
          }]
        : []
    ),
    
    // Check for additional sub-pages and add relevant crumbs
    ...(location.endsWith("/profile/edit") ? [{ href: "", label: "Edit Profile" }] : []),
    ...(location.endsWith("/edit-basic") ? [{ href: "", label: "Edit Details" }] : []),
    ...(location.includes("/tools/goal-mapping") ? [{ href: "", label: "Goal Mapping Tool" }] : []),
    ...(location.includes("/tools/cynefin-orientation") ? [{ href: "", label: "Cynefin Tool" }] : []),
    ...(location.includes("/tools/tcof-journey") ? [{ href: "", label: "TCOF Journey Tool" }] : []),
    ...(location.includes("/make-a-plan") ? [{ href: "", label: "Make a Plan" }] : []),
    ...(location.includes("/heuristics") ? [{ href: "", label: "Success Factors" }] : []),
  ];

  console.log(`[${COMPONENT_ID}] Final breadcrumbs:`, crumbs);
  
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto px-4"
    >
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href + idx} className="flex items-center">
          <Link
            href={crumb.href}
            className={`hover:text-tcof-teal ${
              idx === crumbs.length - 1 ? "font-medium text-tcof-dark" : ""
            }`}
            aria-current={idx === crumbs.length - 1 ? "page" : undefined}
          >
            {idx === 0
              ? <Home className="inline h-4 w-4" aria-hidden="true" />
              : crumb.label
            }
            {idx === 0 && <span className="sr-only">Home</span>}
          </Link>
          {idx < crumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
          )}
        </span>
      ))}
    </nav>
  );
}