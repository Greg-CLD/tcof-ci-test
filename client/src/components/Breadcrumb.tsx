import React, { useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Organisation { id: string; name: string; }
interface Project      { id: string; name: string; }

export function Breadcrumb() {
  const [location] = useLocation();
  const { orgId, projectId } = useParams<{ orgId?: string; projectId?: string }>();

  // fetch organisation (falls back to ID)
  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organisation", orgId],
    queryFn: () => apiRequest("GET", `/api/organisations/${orgId}`).then(r => r.json()),
    enabled: !!orgId,
  });

  // fetch project (falls back to ID)
  const { data: proj, isLoading: projLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}`).then(r => r.json()),
    enabled: !!projectId,
  });

  const crumbs = useMemo(() => {
    const c: { href: string; label: string }[] = [
      { href: "/", label: "Home" },
    ];

    if (location.startsWith("/organisations")) {
      c.push({ href: "/organisations", label: "Organisations" });
    }

    if (orgId) {
      c.push({
        href: `/organisations/${orgId}`,
        label: orgLoading
          ? orgId
          : org?.name || orgId
      });
    }

    if (projectId) {
      c.push({
        href: `/organisations/${orgId}/projects/${projectId}`,
        label: projLoading
          ? projectId
          : proj?.name || projectId
      });
    }

    // example sub-page
    if (location.endsWith("/profile/edit")) {
      c.push({ href: "", label: "Edit Profile" });
    }

    if (location.includes("/tools/goal-mapping")) {
      c.push({ href: "", label: "Goal Mapping" });
    }

    return c;
  }, [location, orgId, projectId, org, proj, orgLoading, projLoading]);

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto px-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href + idx} className="flex items-center">
          <Link
            href={crumb.href || location}
            className={idx === crumbs.length - 1 ? "font-medium text-tcof-dark" : "hover:text-tcof-teal"}
            aria-current={idx === crumbs.length - 1 ? "page" : undefined}
          >
            {idx === 0
              ? <Home className="inline h-4 w-4" />
              : crumb.label
            }
          </Link>
          {idx < crumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-1" />
          )}
        </span>
      ))}
    </nav>
  );
}