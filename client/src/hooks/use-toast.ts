import { toast as sonnerToast } from "sonner";
import React from "react";

// Define toast types
export type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

// For direct import: import { toast } from "@/hooks/use-toast"
export const toast = ({ 
  title, 
  description, 
  variant = "default", 
  duration = 5000,
  action
}: ToastProps) => {
  switch (variant) {
    case "destructive":
      return sonnerToast.error(title, {
        description,
        duration,
        action
      });
    case "success":
      return sonnerToast.success(title, {
        description,
        duration,
        action
      });
    case "info":
      return sonnerToast.info(title, {
        description,
        duration,
        action
      });
    case "warning":
      return sonnerToast.warning(title, {
        description,
        duration,
        action
      });
    default:
      return sonnerToast(title, {
        description,
        duration,
        action
      });
  }
};

// Hook version: import { useToast } from "@/hooks/use-toast"
export function useToast() {
  return { toast };
}