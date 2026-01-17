import pino from 'pino';
import { env } from '../config/env';

/**
 * Centralized logger configuration.
 * 
 * Development: Pretty-printed, human-readable logs with pino-pretty
 * Production: Structured JSON logs for log aggregation systems
 */
const isDevelopment = env.NODE_ENV === 'development';

// Determine log level from environment or default based on NODE_ENV
const logLevel = env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
  },
};

// In development, try to use pino-pretty for human-readable output
// Fall back to JSON if pino-pretty is not available (e.g., in production builds)
let logger: pino.Logger;

if (isDevelopment) {
  try {
    // Development: pretty-printed logs
    logger = pino(loggerConfig, pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }));
  } catch (error) {
    // Fall back to JSON logging if pino-pretty is not available
    logger = pino(loggerConfig);
  }
} else {
  // Production: structured JSON logs
  logger = pino(loggerConfig);
}

// Export the logger instance
export { logger };

/**
 * Helper function to create a child logger with contextual metadata.
 * Useful for adding requestId, userId, etc. to logs.
 */
export function createChildLogger(metadata: Record<string, unknown>) {
  return logger.child(metadata);
}

