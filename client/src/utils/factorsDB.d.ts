export interface FactorTasks {
  Identification: string[];
  Definition: string[];
  Delivery: string[];
  Closure: string[];
}

export interface Factor {
  id: string;
  title: string;
  tasks: FactorTasks;
}

export function getFactors(): Promise<Factor[]>;
export function saveFactors(newList: Factor[]): Promise<void>;