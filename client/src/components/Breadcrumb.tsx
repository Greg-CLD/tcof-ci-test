import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams, useRoute } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Organisation { id: string; name: string; }
interface Project      { id: string; name: string; }

interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumb() {
  const [location] = useLocation();
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const [orgId, setOrgId] = useState<string | undefined>(params.orgId);
  const [projectId, setProjectId] = useState<string | undefined>(params.projectId);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ href: "/", label: "Home" }]);
  
  // Check for various routes to determine parameters
  const [matchOrgProj] = useRoute<{ orgId: string; projectId: string }>("/organisations/:orgId/projects/:projectId");
  const [matchOrgProjEdit] = useRoute<{ orgId: string; projectId: string }>("/organisations/:orgId/projects/:projectId/edit-basic");
  const [matchOrgProjProfileEdit] = useRoute<{ orgId: string; projectId: string }>("/organisations/:orgId/projects/:projectId/profile/edit");
  const [matchOrg] = useRoute<{ orgId: string }>("/organisations/:orgId");
  const [matchOrgTools] = useRoute<{ orgId: string }>("/organisations/:orgId/heuristics");
  const [matchProj] = useRoute<{ projectId: string }>("/projects/:projectId");
  const [matchProjEdit] = useRoute<{ projectId: string }>("/projects/:projectId/edit-basic");
  const [matchProjProfileEdit] = useRoute<{ projectId: string }>("/projects/:projectId/profile/edit");
  const [matchMakePlan] = useRoute<{ projectId: string }>("/make-a-plan/:projectId");
  const [matchMakePlanBlock] = useRoute<{ projectId: string; blockId: string }>("/make-a-plan/:projectId/:blockId");
  
  // Update IDs from matched routes
  useEffect(() => {
    let newOrgId: string | undefined = undefined;
    let newProjectId: string | undefined = undefined;
    
    if (matchOrgProj || matchOrgProjEdit || matchOrgProjProfileEdit) {
      newOrgId = matchOrgProj?.orgId || matchOrgProjEdit?.orgId || matchOrgProjProfileEdit?.orgId;
      newProjectId = matchOrgProj?.projectId || matchOrgProjEdit?.projectId || matchOrgProjProfileEdit?.projectId;
    } else if (matchOrg || matchOrgTools) {
      newOrgId = matchOrg?.orgId || matchOrgTools?.orgId;
    } else if (matchProj || matchProjEdit || matchProjProfileEdit) {
      newProjectId = matchProj?.projectId || matchProjEdit?.projectId || matchProjProfileEdit?.projectId;
      
      // For legacy routes, try to find orgId from localStorage
      const storedOrgId = localStorage.getItem('currentOrgId');
      if (storedOrgId) {
        newOrgId = storedOrgId;
      }
    } else if (matchMakePlan || matchMakePlanBlock) {
      newProjectId = matchMakePlan?.projectId || matchMakePlanBlock?.projectId;
      
      // For make-a-plan routes, try to find orgId from localStorage
      const storedOrgId = localStorage.getItem('currentOrgId');
      if (storedOrgId) {
        newOrgId = storedOrgId;
      }
    }
    
    setOrgId(newOrgId);
    setProjectId(newProjectId);
  }, [
    location, 
    matchOrgProj, matchOrgProjEdit, matchOrgProjProfileEdit,
    matchOrg, matchOrgTools,
    matchProj, matchProjEdit, matchProjProfileEdit,
    matchMakePlan, matchMakePlanBlock
  ]);

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

  // Update crumbs based on current location and fetched data
  useEffect(() => {
    const newCrumbs: Crumb[] = [
      { href: "/", label: "Home" },
    ];

    // Add organisation segment when relevant
    if (location.includes("/organisations")) {
      newCrumbs.push({ href: "/organisations", label: "Organisations" });
    
      if (orgId) {
        newCrumbs.push({
          href: `/organisations/${orgId}`,
          label: orgLoading ? orgId : org?.name || orgId
        });
      }
    }

    // Add project when relevant (prioritize new URL structure)
    if (projectId) {
      const projectUrl = orgId 
        ? `/organisations/${orgId}/projects/${projectId}` 
        : `/projects/${projectId}`;
        
      newCrumbs.push({
        href: projectUrl,
        label: projLoading ? projectId : proj?.name || projectId
      });
    }

    // Add tool pages
    if (location.includes("/goal-mapping")) {
      newCrumbs.push({ href: "", label: "Goal Mapping" });
    } else if (location.includes("/cynefin-orientation")) {
      newCrumbs.push({ href: "", label: "Cynefin Orientation" });
    } else if (location.includes("/tcof-journey")) {
      newCrumbs.push({ href: "", label: "TCOF Journey" });
    } else if (location.includes("/make-a-plan")) {
      if (!location.includes("/block-")) {
        newCrumbs.push({ href: "", label: "Make a Plan" });
      } else {
        newCrumbs.push({ 
          href: projectId ? `/make-a-plan/${projectId}` : "/make-a-plan", 
          label: "Make a Plan" 
        });
        
        // Add block info
        if (location.includes("/block-1")) {
          newCrumbs.push({ href: "", label: "Block 1: Discover" });
        } else if (location.includes("/block-2")) {
          newCrumbs.push({ href: "", label: "Block 2: Design" });
        } else if (location.includes("/block-3")) {
          newCrumbs.push({ href: "", label: "Block 3: Deliver" });
        }
      }
    } else if (location.includes("/profile/edit") || location.includes("/edit-basic")) {
      newCrumbs.push({ href: "", label: "Edit Profile" });
    } else if (location.includes("/settings")) {
      newCrumbs.push({ href: "/settings", label: "Settings" });
    }

    setCrumbs(newCrumbs);
  }, [location, orgId, projectId, org, proj, orgLoading, projLoading]);

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto px-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={`${crumb.href}-${idx}-${location}`} className="flex items-center">
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