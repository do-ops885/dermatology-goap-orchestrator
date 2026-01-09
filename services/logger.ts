export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  event: string;
  metadata?: Record<string, any>;
}

class LoggerService {
  private static instance: LoggerService;
  
  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public log(level: LogLevel, component: string, event: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      event,
      metadata: this.sanitize(metadata)
    };

    if (level === 'error') {
      console.error(`[${component}] ${event}`, entry);
    } else if (level === 'warn') {
      console.warn(`[${component}] ${event}`, entry);
    } else {
      console.log(`[${component}] ${event}`, entry);
    }
  }

  private sanitize(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;
    const sanitized = { ...data };
    
    // Redact PII or large binary data
    const redactionKeys = ['base64Image', 'imageBytes', 'ciphertext', 'iv'];
    
    redactionKeys.forEach(key => {
        if (key in sanitized) sanitized[key] = '[REDACTED]';
    });

    return sanitized;
  }

  public info(component: string, event: string, metadata?: Record<string, any>) {
    this.log('info', component, event, metadata);
  }

  public warn(component: string, event: string, metadata?: Record<string, any>) {
    this.log('warn', component, event, metadata);
  }

  public error(component: string, event: string, metadata?: Record<string, any>) {
    this.log('error', component, event, metadata);
  }
}

export const Logger = LoggerService.getInstance();