import { config } from "../config/env";

// Log levels (in order of severity)
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

// ANSI color codes for terminal
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

export class Logger {
  /**
   * Format timestamp for logs
   */
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format log message with color and metadata
   */
  private static formatMessage(
    level: LogLevel,
    message: string,
    meta?: any
  ): string {
    const timestamp = this.getTimestamp();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";

    let color = colors.reset;
    let emoji = "";

    switch (level) {
      case LogLevel.DEBUG:
        color = colors.gray;
        emoji = "🔍";
        break;
      case LogLevel.INFO:
        color = colors.blue;
        emoji = "ℹ️";
        break;
      case LogLevel.WARN:
        color = colors.yellow;
        emoji = "⚠️";
        break;
      case LogLevel.ERROR:
        color = colors.red;
        emoji = "❌";
        break;
    }

    return `${color}${emoji} [${level.toUpperCase()}] ${timestamp} - ${message}${metaStr}${
      colors.reset
    }`;
  }

  /**
   * Check if log level should be shown
   */
  private static shouldLog(level: LogLevel): boolean {
    const configLevel = config.logging.level;

    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const configIndex = levels.indexOf(configLevel as LogLevel);
    const currentIndex = levels.indexOf(level);

    // Show if current level >= config level
    return currentIndex >= configIndex;
  }

  /**
   * Debug logs (only in development)
   */
  static debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }

  /**
   * Info logs (general information)
   */
  static info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, meta));
    }
  }

  /**
   * Warning logs (potential issues)
   */
  static warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, meta));
    }
  }

  /**
   * Error logs (something went wrong)
   */
  static error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error;
      console.error(this.formatMessage(LogLevel.ERROR, message, errorDetails));
    }
  }

  /**
   * API call logging helper
   */
  static apiCall(method: string, url: string, duration?: number): void {
    const meta = duration ? { duration: `${duration}ms` } : undefined;
    this.debug(`API ${method} ${url}`, meta);
  }

  /**
   * Cache operation logging helper
   */
  static cache(operation: "hit" | "miss" | "set", key: string): void {
    const emoji =
      operation === "hit" ? "✅" : operation === "miss" ? "❌" : "💾";
    this.debug(`${emoji} Cache ${operation}: ${key}`);
  }
}
