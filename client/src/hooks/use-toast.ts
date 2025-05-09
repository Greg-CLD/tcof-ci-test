import { toast as sonnerToast } from "sonner";

// Define toast types
export type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

// For direct import: import { toast } from "@/hooks/use-toast"
export const toast = ({ 
  title, 
  description, 
  variant = "default", 
  duration = 5000 
}: ToastProps) => {
  switch (variant) {
    case "destructive":
      return sonnerToast.error(title, {
        description,
        duration,
      });
    case "success":
      return sonnerToast.success(title, {
        description,
        duration,
      });
    case "info":
      return sonnerToast.info(title, {
        description,
        duration,
      });
    case "warning":
      return sonnerToast.warning(title, {
        description,
        duration,
      });
    default:
      return sonnerToast(title, {
        description,
        duration,
      });
  }
};

// Hook version: import { useToast } from "@/hooks/use-toast"
export function useToast() {
  return { toast };
}