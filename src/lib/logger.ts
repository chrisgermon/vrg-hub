/**
 * Centralized logging service
 * - In development: logs to console
 * - In production: only logs errors, can be extended to send to monitoring service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, data?: any): LogMessage {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog('debug')) return;
    const logMsg = this.formatMessage('debug', message, data);
    console.log(`[DEBUG] ${logMsg.message}`, data || '');
  }

  info(message: string, data?: any) {
    if (!this.shouldLog('info')) return;
    const logMsg = this.formatMessage('info', message, data);
    console.info(`[INFO] ${logMsg.message}`, data || '');
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog('warn')) return;
    const logMsg = this.formatMessage('warn', message, data);
    console.warn(`[WARN] ${logMsg.message}`, data || '');
  }

  error(message: string, error?: any, data?: any) {
    if (!this.shouldLog('error')) return;
    const logMsg = this.formatMessage('error', message, { error, ...data });
    console.error(`[ERROR] ${logMsg.message}`, error || '', data || '');

    // In production, send to error tracking service (Sentry, etc.)
    if (!this.isDevelopment) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { extra: data });
    }
  }
}

export const logger = new Logger();
