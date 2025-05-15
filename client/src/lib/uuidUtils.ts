/**
 * Provides compatibility layer to avoid breaking existing imports
 * Imports from and re-exports all functions from uuid-utils.ts
 */
import { 
  isValidUUID,
  isNumericId,
  filterUUIDProjects,
  convertToUuid,
  getOriginalId,
  wasGeneratedFrom,
  generateUuid,
  safeConvertToUuid
} from './uuid-utils';

export {
  isValidUUID,
  isNumericId,
  filterUUIDProjects,
  convertToUuid,
  getOriginalId,
  wasGeneratedFrom,
  generateUuid,
  safeConvertToUuid
};