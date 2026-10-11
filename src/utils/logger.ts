/**
 * Production-ready Logger system.
 * Supports leveled logging (debug, info, warn, error), network payload logging,
 * and an in-memory buffer for diagnostics and bug reporting.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
}

type LogListener = (entry: LogEntry) => void;

class Logger {
  private buffer: LogEntry[] = [];
  private maxBufferSize = 200;
  private listeners: Set<LogListener> = new Set();

  private createEntry(level: LogLevel, tag: string, message: string, data?: unknown): LogEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      data,
    };
  }

  private dispatch(entry: LogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    if (__DEV__) {
      const prefix = `[${entry.level.toUpperCase()}][${entry.tag}]`;
      if (entry.level === 'error') {
        console.error(prefix, entry.message, entry.data ?? '');
      } else if (entry.level === 'warn') {
        console.warn(prefix, entry.message, entry.data ?? '');
      } else {
        console.log(prefix, entry.message, entry.data ?? '');
      }
    }

    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Logger listener failure', err);
      }
    });
  }

  debug(tag: string, message: string, data?: unknown) {
    this.dispatch(this.createEntry('debug', tag, message, data));
  }

  info(tag: string, message: string, data?: unknown) {
    this.dispatch(this.createEntry('info', tag, message, data));
  }

  warn(tag: string, message: string, data?: unknown) {
    this.dispatch(this.createEntry('warn', tag, message, data));
  }

  error(tag: string, message: string, data?: unknown) {
    this.dispatch(this.createEntry('error', tag, message, data));
  }

  getLogs(): readonly LogEntry[] {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const logger = new Logger();
