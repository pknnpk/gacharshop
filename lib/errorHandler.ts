/**
 * Error Handling Utilities
 * 
 * Provides consistent error handling and classification for the application.
 */

import { errorLog } from './middleware/logger';

/**
 * Custom application error classes
 */
export class AppError extends Error {
    public statusCode: number;
    public code: string;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public details?: any;

    constructor(message: string, details?: any) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.details = details;
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests', retryAfter?: number) {
        super(message, 429, 'RATE_LIMIT');
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
    public retryAfter?: number;
}

export class DatabaseError extends AppError {
    constructor(message: string = 'Database operation failed') {
        super(message, 500, 'DB_ERROR');
        this.name = 'DatabaseError';
    }
}

export class ExternalServiceError extends AppError {
    constructor(service: string, message: string = 'External service error') {
        super(message, 502, 'EXTERNAL_SERVICE_ERROR');
        this.name = 'ExternalServiceError';
        this.service = service;
    }
    public service: string;
}

/**
 * Error handler function for API routes
 */
export function handleApiError(error: unknown, context?: {
    method?: string;
    url?: string;
    userId?: string;
}): { status: number; message: string; code: string } {
    // Log the error
    errorLog('API Error occurred', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        ...context
    });

    // Handle known error types
    if (error instanceof AppError) {
        return {
            status: error.statusCode,
            message: error.message,
            code: error.code
        };
    }

    // Handle MongoDB duplicate key error
    if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
        return {
            status: 409,
            message: 'Duplicate entry found',
            code: 'DUPLICATE_KEY'
        };
    }

    // Handle MongoDB validation error
    if (error instanceof Error && error.name === 'ValidationError') {
        return {
            status: 400,
            message: 'Validation failed',
            code: 'MONGO_VALIDATION_ERROR'
        };
    }

    // Handle NextAuth errors
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
        return {
            status: 401,
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
        };
    }

    // Default to internal server error
    return {
        status: 500,
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error instanceof Error ? error.message : 'Unknown error',
        code: 'INTERNAL_ERROR'
    };
}

/**
 * Async handler wrapper for API routes
 */
export function asyncHandler<T>(
    handler: (req: Request, ...args: any[]) => Promise<T>
) {
    return async function wrapper(req: Request, ...args: any[]): Promise<T> {
        try {
            return await handler(req, ...args);
        } catch (error) {
            throw error;
        }
    };
}

/**
 * Create an error response from error handler result
 */
export function createErrorResponse(
    status: number,
    message: string,
    code: string
) {
    return {
        success: false,
        error: message,
        code
    };
}
