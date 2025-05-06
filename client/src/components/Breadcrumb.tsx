import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Organisation { id: string; name: string; }
interface Project      { id: string; name: string; }

export function Breadcrumb() {
  const [location] = useLocation();
  // Wouter uses ":id" in your route, so we grab that and rename to orgId
  const { id: orgId, projectId } = useParams<{
    id?: string;
    projectId?: string;
  }>();

  // Fetch org when we have an orgId
  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError
  } = useQuery<Organisation>({
    queryKey: ["organisation", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("No orgId");
      const res = await apiRequest("GET", `/api/organisations/${orgId}`);
      if (!res.ok) throw new Error("Failed to load org");
      return res.json();
    },
    enabled: Boolean(orgId),
    staleTime: 60_000
  });

  // Fetch project when we have a projectId
  const {
    data: proj,
    isLoading: projLoading,
    isError: projError
  } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No projectId");
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json();
    },
    enabled: Boolean(projectId),
    staleTime: 60_000
  });

  // Build crumbs
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/organisations", label: "Organisations" },
    // only if we have an orgId in the URL
    ...(orgId
      ? [{
          href: `/organisations/${orgId}`,
          label: orgLoading
            ? "Loading..."
            : orgError || !org
              ? "Unknown Org"
              : org.name
        }]
      : []),
    // only if we have a projectId in the URL
    ...(projectId
      ? [{
          href: `/organisations/${orgId}/projects/${projectId}`,
          label: projLoading
            ? "Loading..."
            : projError || !proj
              ? "Unknown Project"
              : proj.name
        }]
      : []),
    // any deeper pages
    ...(location.endsWith("/profile/edit")
      ? [{ href: "", label: "Edit Profile" }]
      : []),
    ...(location.includes("/tools/goal-mapping")
      ? [{ href: "", label: "Goal Mapping" }]
      : []),
    // add other tool crumbs here...
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto px-4"
    >
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href + idx} className="flex items-center">
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
              crumb.label
            )}
            {idx === 0 && <span className="sr-only">Home</span>}
          </Link>
          {idx < crumbs.length - 1 && (
            <ChevronRight
              className="h-4 w-4 mx-1"
              aria-hidden="true"
            />
          )}
        </span>
      ))}
    </nav>
  );
}