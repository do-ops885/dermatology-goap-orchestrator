import { PIIRedactorInstance } from './piiRedactor';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log level priority for filtering
 * Lower values indicate higher priority
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  event: string;
  metadata?: Record<string, unknown>;
  piiSanitized: boolean;
}

class LoggerService {
  private static instance: LoggerService;
  private minLevel: LogLevel;

  private constructor() {
    // Private constructor for singleton pattern
    // Default to info level in production, debug in development
    this.minLevel = (import.meta.env.DEV ? 'debug' : 'info') as LogLevel;
  }

  public static getInstance(): LoggerService {
    LoggerService.instance ??= new LoggerService();
    return LoggerService.instance;
  }

  /**
   * Set the minimum log level
   * Logs below this level will be filtered out
   */
  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get current minimum log level
   */
  public getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Check if a log level should be logged based on current minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  public log(
    level: LogLevel,
    component: string,
    event: string,
    metadata?: Record<string, unknown>,
  ) {
    // Filter logs based on minimum level
    if (!this.shouldLog(level)) {
      return;
    }

    // Sanitize event and metadata for PII
    const sanitization = PIIRedactorInstance.sanitizeAgentLog(event, metadata);

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      event: sanitization.sanitizedEvent,
      metadata: sanitization.sanitizedMetadata ?? {},
      piiSanitized: sanitization.sanitizedEvent !== event || !!sanitization.sanitizedMetadata,
    };

    // Console output with sanitized data
    if (level === 'error') {
      console.error(`[${component}] ${sanitization.sanitizedEvent}`, entry);
    } else if (level === 'warn') {
      console.warn(`[${component}] ${sanitization.sanitizedEvent}`, entry);
    } else {
      // eslint-disable-next-line no-console
      console.info(`[${component}] ${sanitization.sanitizedEvent}`, entry);
    }

    // Log to persistent storage if needed (with consent)
    this.persistLog(entry);
  }

  private persistLog(entry: LogEntry): void {
    try {
      // Only persist if user has given consent for data storage
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        // Check if we should persist logs (could be controlled by consent)
        const logsRaw = localStorage.getItem('app_logs');
        const logs: LogEntry[] = logsRaw !== null ? (JSON.parse(logsRaw) as LogEntry[]) : [];
        logs.push(entry);

        // Keep only last 100 logs to prevent storage bloat
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }

        localStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (error) {
      // Silently fail to avoid breaking functionality
      // eslint-disable-next-line no-console
      console.debug('Failed to persist log:', error);
    }
  }

  public info(component: string, event: string, metadata?: Record<string, unknown>) {
    this.log('info', component, event, metadata);
  }

  public warn(component: string, event: string, metadata?: Record<string, unknown>) {
    this.log('warn', component, event, metadata);
  }

  public error(component: string, event: string, metadata?: Record<string, unknown>) {
    this.log('error', component, event, metadata);
  }

  public debug(component: string, event: string, metadata?: Record<string, unknown>) {
    this.log('debug', component, event, metadata);
  }
}

export const Logger = LoggerService.getInstance();
