/**
 * Logging Middleware and Utilities
 * 
 * Provides structured logging for API routes including execution time tracking.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    method?: string;
    url?: string;
    ip?: string;
    userId?: string;
    executionTime?: number;
    statusCode?: number;
    error?: string;
    stack?: string;
    metadata?: Record<string, any>;
    requestId?: string;
    // Additional fields for specific logging
    messageCount?: number;
    messageId?: string;
    richMenuId?: string;
    endpoint?: string;
    service?: string;
    orderId?: string;
    orderNumber?: string;
    success?: boolean;
    collection?: string;
    operation?: string;
    to?: string;
}

/**
 * Create a structured log entry
 */
function createLogEntry(
    level: LogLevel,
    message: string,
    metadata: Partial<LogEntry> = {}
): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...metadata
    };
}

/**
 * Log a message at the specified level
 */
export function log(
    level: LogLevel,
    message: string,
    metadata: Partial<LogEntry> = {}
): void {
    const entry = createLogEntry(level, message, metadata);

    // In development, also log to console for debugging
    if (process.env.NODE_ENV !== 'production') {
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
        if (entry.error) {
            console.error(prefix, entry.message, entry);
        } else {
            console.log(prefix, entry.message, entry.metadata ? JSON.stringify(entry.metadata) : '');
        }
    }

    // In production, you could send to a logging service like:
    // - Winston/Pino for file logging
    // - LogRocket/Sentry for error tracking
    // - CloudWatch/Loki for cloud logging
}

/**
 * Debug level log
 */
export function debug(message: string, metadata?: Partial<LogEntry>): void {
    log(LogLevel.DEBUG, message, metadata);
}

/**
 * Info level log
 */
export function info(message: string, metadata?: Partial<LogEntry>): void {
    log(LogLevel.INFO, message, metadata);
}

/**
 * Warning level log
 */
export function warn(message: string, metadata?: Partial<LogEntry>): void {
    log(LogLevel.WARN, message, metadata);
}

/**
 * Error level log
 */
export function errorLog(message: string, metadata?: Partial<LogEntry>): void {
    log(LogLevel.ERROR, message, metadata);
}

/**
 * Create a logging middleware for API routes
 * Tracks execution time and logs request/response details
 */
export function createLoggingMiddleware(options: {
    logRequest?: boolean;
    logResponse?: boolean;
    logExecutionTime?: boolean;
    excludePaths?: string[];
} = {}) {
    const {
        logRequest = true,
        logResponse = true,
        logExecutionTime = true,
        excludePaths = ['/api/health', '/api/ping']
    } = options;

    return function loggingMiddleware(request: NextRequest): void {
        // Skip excluded paths
        if (excludePaths.some(path => request.url.includes(path))) {
            return;
        }

        const startTime = Date.now();
        const requestId = crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9);

        // Log request
        if (logRequest) {
            debug('Incoming request', {
                method: request.method,
                url: request.url,
                ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                requestId
            });
        }

        // Add request ID to response headers
        const response = NextResponse.next();
        response.headers.set('X-Request-ID', requestId);

        // Log execution time
        if (logExecutionTime) {
            const executionTime = Date.now() - startTime;
            response.headers.set('X-Response-Time', `${executionTime}ms`);

            // Log warning for slow requests
            if (executionTime > 5000) {
                warn('Slow request detected', {
                    method: request.method,
                    url: request.url,
                    executionTime,
                    requestId
                });
            }
        }
    };
}

/**
 * Log API error with full stack trace
 */
export function logApiError(
    error: unknown,
    context: {
        method?: string;
        url?: string;
        userId?: string;
        requestId?: string;
    } = {}
): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    errorLog('API Error', {
        method: context.method,
        url: context.url,
        userId: context.userId,
        requestId: context.requestId,
        error: errorMessage,
        stack: errorStack
    });
}

/**
 * Log database operation
 */
export function logDbOperation(
    operation: string,
    collection: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    log(level, `DB ${operation} on ${collection}`, {
        executionTime: duration,
        metadata: { success, collection, ...metadata }
    });
}

/**
 * Log external API call
 */
export function logExternalApiCall(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    error?: string
): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    log(level, `External API call to ${service}`, {
        executionTime: duration,
        metadata: { service, endpoint, success, error }
    });
}

/**
 * Performance timer helper
 */
export class PerformanceTimer {
    private startTime: number;
    private operation: string;

    constructor(operation: string) {
        this.operation = operation;
        this.startTime = Date.now();
    }

    /**
     * Stop the timer and log the result
     */
    stop(success: boolean = true, metadata?: Record<string, any>): number {
        const duration = Date.now() - this.startTime;
        logDbOperation(this.operation, 'internal', duration, success, metadata);
        return duration;
    }
}
