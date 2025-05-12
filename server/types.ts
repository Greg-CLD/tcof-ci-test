// Type definitions for server code

// Goal Mapping interfaces
export interface GoalMapRequestBody {
  projectId: number;
  name: string;
  goals?: any[];
  nodes?: any[];
  connections?: any[];
  lastUpdated?: Date | string;
  originalProjectId?: number;
}

export interface Goal {
  id: string;
  text: string;
  stage?: string;
  origin?: string;
  createdAt?: string | Date;
}

// Cynefin Selection interfaces
export interface CynefinRequestBody {
  projectId: number;
  name: string;
  lastUpdated?: Date | string;
  originalProjectId?: number;
}

// TCOF Journey interfaces
export interface TcofJourneyRequestBody {
  projectId: number;
  name: string;
  lastUpdated?: Date | string;
  originalProjectId?: number;
}

// Project interfaces
export interface ProjectRequestBody {
  name: string;
  description?: string;
  sector?: string;
  organisationId?: number;
  complexity?: string;
  size?: string;
  status?: string;
  templateId?: number;
}

// Error handling helpers
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

export function handleServerError(res: any, error: unknown): void {
  console.error("Server error:", error);
  const errorMessage = getErrorMessage(error);
  res.status(500).json({ message: errorMessage });
}