import { type LucideIcon, BarChart as DashboardIcon, User, History, Settings, Filter } from "lucide-react";

export interface UserMenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const USER_MENU_ITEMS: UserMenuItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { path: "/profile", label: "My Profile", icon: User },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/history", label: "View History", icon: History },
];

export const ADMIN_MENU_ITEMS: UserMenuItem[] = [
  { path: "/make-a-plan/admin/factors", label: "Admin - Factors", icon: Filter },
  { path: "/make-a-plan/admin/diagnostics", label: "Task Diagnostics", icon: DashboardIcon },
  { path: "/make-a-plan/admin", label: "Admin - Presets", icon: Filter },
];
