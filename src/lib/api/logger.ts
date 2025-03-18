/**
 * Logger utility that conditionally logs based on environment
 */

type LogArgs = unknown[];

interface Logger {
  log: (message: string, ...args: LogArgs) => void;
  debug: (message: string, ...args: LogArgs) => void;
  warn: (message: string, ...args: LogArgs) => void;
  error: (message: string, ...args: LogArgs) => void;
  scope: (scope: string) => Logger;
}

export const logger: Logger = {
  /**
   * Log a message (only in development by default)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  log: (message: string, ...args: LogArgs): void => {
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_PROD_LOGGING === "true"
    ) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log debug information (only in development)
   * @param message The message to log
   * @param args Additional arguments to log
   */
  debug: (message: string, ...args: LogArgs): void => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log a warning message
   * @param message The warning message
   * @param args Additional arguments to log
   */
  warn: (message: string, ...args: LogArgs): void => {
    // We log warnings in all environments
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log an error message
   * @param message The error message
   * @param args Additional arguments to log (e.g., the error object)
   */
  error: (message: string, ...args: LogArgs): void => {
    // We log errors in all environments
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Create a scoped logger with a prefix
   * @param scope The scope prefix to add to log messages
   * @returns A logger instance with the same methods but scoped to the prefix
   */
  scope: (scope: string): Logger => {
    return {
      log: (message: string, ...args: LogArgs): void =>
        logger.log(`[${scope}] ${message}`, ...args),
      debug: (message: string, ...args: LogArgs): void =>
        logger.debug(`[${scope}] ${message}`, ...args),
      warn: (message: string, ...args: LogArgs): void =>
        logger.warn(`[${scope}] ${message}`, ...args),
      error: (message: string, ...args: LogArgs): void =>
        logger.error(`[${scope}] ${message}`, ...args),
      scope: logger.scope,
    };
  },
};
