/**
 * Système de logging centralisé
 * Remplace les console.log/error/warn par un système unifié
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
    };

    this.logs.push(entry);

    // Limiter le nombre de logs en mémoire
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // En production, on peut choisir de ne logger que les erreurs
    if (process.env.NODE_ENV === 'production' && level === LogLevel.DEBUG) {
      return;
    }

    // Utiliser console native pour le moment
    switch (level) {
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[${level.toUpperCase()}] ${message}`, data || '');
        }
        break;
      case LogLevel.INFO:
        console.info(`[${level.toUpperCase()}] ${message}`, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`[${level.toUpperCase()}] ${message}`, data || '');
        break;
      case LogLevel.ERROR:
        console.error(`[${level.toUpperCase()}] ${message}`, data || '');
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Instance singleton
export const logger = new Logger();

// Export des fonctions pour faciliter l'utilisation
export const logDebug = (message: string, data?: any) => logger.debug(message, data);
export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);
export const logError = (message: string, data?: any) => logger.error(message, data);

