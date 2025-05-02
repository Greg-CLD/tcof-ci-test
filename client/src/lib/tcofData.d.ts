// Type definitions for tcofData.js
export function getTcofData(): Array<{
  id: string;
  name: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}>;

export function getTcofFactorOptions(): Array<{
  value: string;
  label: string;
}>;

export function getFactorTasks(factorId: string, stage: string): string[];