import React from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Breadcrumb } from "@/components/Breadcrumb";
import ProjectBanner from "@/components/ProjectBanner";
import { Toaster } from "@/components/ui/toaster";
import { QuickAuthDebug } from "@/components/QuickAuthDebug";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout provides a consistent layout across the application.
 * It includes the header, breadcrumb navigation, project context banner,
 * content area, and footer.
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <Breadcrumb />
      <ProjectBanner />
      <div className="flex-grow">
        {children}
      </div>
      <SiteFooter />
      <Toaster />
      <QuickAuthDebug />
    </div>
  );
};

export default AppLayout;