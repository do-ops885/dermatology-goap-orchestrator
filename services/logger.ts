import { PIIRedactorInstance } from './piiRedactor';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): LoggerService {
    LoggerService.instance ??= new LoggerService();
    return LoggerService.instance;
  }

  public log(
    level: LogLevel,
    component: string,
    event: string,
    metadata?: Record<string, unknown>,
  ) {
    // Sanitize event and metadata for PII
    const sanitization = PIIRedactorInstance.sanitizeAgentLog(event, metadata);

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      event: sanitization.sanitizedEvent,
      metadata: sanitization.sanitizedMetadata,
      piiSanitized: sanitization.sanitizedEvent !== event || !!sanitization.sanitizedMetadata,
    };

    // Console output with sanitized data
    if (level === 'error') {
      console.error(`[${component}] ${sanitization.sanitizedEvent}`, entry);
    } else if (level === 'warn') {
      console.warn(`[${component}] ${sanitization.sanitizedEvent}`, entry);
    } else {
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
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push(entry);

        // Keep only last 100 logs to prevent storage bloat
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }

        localStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (error) {
      // Silently fail to avoid breaking functionality
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
