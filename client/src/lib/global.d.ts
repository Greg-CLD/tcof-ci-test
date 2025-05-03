import { TCOFFactorTask } from './tcofData';

// Global augmentation for window
declare global {
  interface Window {
    _cachedFactors?: TCOFFactorTask[];
  }
}

export {};