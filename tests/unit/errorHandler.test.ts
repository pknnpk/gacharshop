/**
 * Unit Tests for Error Handling Utilities
 */

import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    handleApiError,
} from '@/lib/errorHandler';

describe('Error Classes', () => {
    describe('AppError', () => {
        it('should create an error with default values', () => {
            const error = new AppError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
            expect(error.isOperational).toBe(true);
            expect(error.name).toBe('Error');
        });

        it('should allow custom status code and code', () => {
            const error = new AppError('Custom error', 400, 'CUSTOM_CODE');

            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('CUSTOM_CODE');
        });
    });

    describe('ValidationError', () => {
        it('should create a validation error with 400 status', () => {
            const error = new ValidationError('Invalid input');

            expect(error.message).toBe('Invalid input');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.name).toBe('ValidationError');
        });

        it('should include details when provided', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });

            expect(error.details).toEqual({ field: 'email' });
        });
    });

    describe('AuthenticationError', () => {
        it('should create an authentication error with 401 status', () => {
            const error = new AuthenticationError();

            expect(error.message).toBe('Authentication required');
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('AUTH_ERROR');
        });

        it('should allow custom message', () => {
            const error = new AuthenticationError('Please login');

            expect(error.message).toBe('Please login');
        });
    });

    describe('AuthorizationError', () => {
        it('should create a forbidden error with 403 status', () => {
            const error = new AuthorizationError();

            expect(error.message).toBe('Access denied');
            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN');
        });
    });

    describe('NotFoundError', () => {
        it('should create a not found error with 404 status', () => {
            const error = new NotFoundError();

            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });

        it('should include custom resource name', () => {
            const error = new NotFoundError('Product');

            expect(error.message).toBe('Product not found');
        });
    });

    describe('ConflictError', () => {
        it('should create a conflict error with 409 status', () => {
            const error = new ConflictError('Item already exists');

            expect(error.message).toBe('Item already exists');
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe('CONFLICT');
        });
    });

    describe('RateLimitError', () => {
        it('should create a rate limit error with 429 status', () => {
            const error = new RateLimitError();

            expect(error.message).toBe('Too many requests');
            expect(error.statusCode).toBe(429);
            expect(error.code).toBe('RATE_LIMIT');
        });

        it('should include retryAfter when provided', () => {
            const error = new RateLimitError('Too many requests', 60);

            expect(error.retryAfter).toBe(60);
        });
    });

    describe('DatabaseError', () => {
        it('should create a database error with 500 status', () => {
            const error = new DatabaseError();

            expect(error.message).toBe('Database operation failed');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('DB_ERROR');
        });
    });

    describe('ExternalServiceError', () => {
        it('should create an external service error with 502 status', () => {
            const error = new ExternalServiceError('Payment Gateway');

            expect(error.message).toBe('External service error');
            expect(error.statusCode).toBe(502);
            expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
            expect(error.service).toBe('Payment Gateway');
        });

        it('should include custom message', () => {
            const error = new ExternalServiceError('Line API', 'Line service unavailable');

            expect(error.message).toBe('Line service unavailable');
        });
    });
});

describe('handleApiError', () => {
    it('should handle AppError correctly', () => {
        const error = new NotFoundError('Product');
        const result = handleApiError(error);

        expect(result.status).toBe(404);
        expect(result.message).toBe('Product not found');
        expect(result.code).toBe('NOT_FOUND');
    });

    it('should handle ValidationError with details', () => {
        const error = new ValidationError('Invalid input', { field: 'email' });
        const result = handleApiError(error);

        expect(result.status).toBe(400);
        expect(result.message).toBe('Invalid input');
    });

    it('should handle generic errors', () => {
        const result = handleApiError(new Error('Unknown error'));

        expect(result.status).toBe(500);
        expect(result.message).toBe('Unknown error');
        expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should handle unknown errors in production', () => {
        vi.stubEnv('NODE_ENV', 'production');

        const result = handleApiError(new Error('Secret error'));

        expect(result.status).toBe(500);
        expect(result.message).toBe('An unexpected error occurred');

        vi.unstubAllEnvs();
    });

    it('should include context in logging', () => {
        const error = new Error('Test error');
        const result = handleApiError(error, {
            method: 'POST',
            url: '/api/test',
            userId: '123'
        });

        // The function should not throw and should return a result
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
    });
});
