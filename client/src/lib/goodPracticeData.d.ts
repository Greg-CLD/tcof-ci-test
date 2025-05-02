declare module '@/lib/goodPracticeData' {
  export interface Framework {
    code: string;
    name: string;
    tasks: {
      Identification: string[];
      Definition: string[];
      Delivery: string[];
      Closure: string[];
    };
  }

  export function getAllGoodPractices(): Framework[];
  export function getFrameworkByCode(code: string): Framework | null;
  export function getFrameworksForZone(zone: string): string[];
  export function calculateZone(scope: string, uncertainty: string): string | null;
  export function getZoneDescription(zone: string): string;
  export function getFrameworkDescription(code: string): string;
}