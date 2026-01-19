import { Request, Response, NextFunction } from 'express';

export interface ApiVersionRequest extends Request {
  apiVersion?: string;
}

const SUPPORTED_VERSIONS = ['v1'];

/**
 * API Version negotiation middleware.
 * 
 * Supports version negotiation via Accept-Version header:
 * - If header is present and matches a supported version, route accordingly
 * - If header is missing, defaults to v1
 * - If unsupported version is requested, returns HTTP 400
 * 
 * The resolved API version is attached to the request context.
 */
export function apiVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Response | void {
  const acceptVersion = req.headers['accept-version'] as string | undefined;

  // Default to v1 if no header is provided
  if (!acceptVersion) {
    (req as ApiVersionRequest).apiVersion = 'v1';
    return next();
  }

  // Normalize version (remove 'v' prefix if present, then add it back)
  const normalizedVersion = acceptVersion.toLowerCase().startsWith('v')
    ? acceptVersion.toLowerCase()
    : `v${acceptVersion.toLowerCase()}`;

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(normalizedVersion)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      supportedVersions: SUPPORTED_VERSIONS,
      requestedVersion: acceptVersion,
    });
  }

  // Attach resolved version to request context
  (req as ApiVersionRequest).apiVersion = normalizedVersion;
  next();
}

