import { Request, Response, NextFunction } from 'express';
import { isValidUUID, isNumericId } from '../utils/uuid-utils.js';

/**
 * Factory to create middleware validating that specific request parameters are UUIDs.
 * If a parameter is missing the middleware does not block the request.
 * Numeric IDs are rejected with a specific error message to guard against
 * legacy ID usage after the UUID migration.
 */
export function validateUuid(paramNames: string | string[]) {
  const params = Array.isArray(paramNames) ? paramNames : [paramNames];

  return function (req: Request, res: Response, next: NextFunction) {
    for (const name of params) {
      const value = req.params[name] ?? req.body?.[name];
      if (!value) {
        continue; // Only validate when a value is provided
      }

      if (isNumericId(value)) {
        return res.status(400).json({
          message: `Invalid ${name} format. Numeric IDs are no longer supported.`,
          error: 'NUMERIC_ID_NOT_SUPPORTED',
          [name]: value,
        });
      }

      if (!isValidUUID(value)) {
        return res.status(400).json({
          message: `Invalid ${name} format. Must be a valid UUID.`,
          error: 'INVALID_UUID_FORMAT',
          [name]: value,
        });
      }
    }

    next();
  };
}

export default validateUuid;
