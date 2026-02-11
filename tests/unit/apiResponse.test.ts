/**
 * Unit Tests for API Response Utilities
 */

import { describe, it, expect } from 'vitest';
import {
    successResponse,
    errorResponse,
    createdResponse,
    validationErrorResponse,
    unauthorizedResponse,
    notFoundResponse,
    tooManyRequestsResponse,
} from '@/lib/apiResponse';

describe('API Response Utilities', () => {
    describe('successResponse', () => {
        it('should return a success response with data', () => {
            const response = successResponse({ id: '123', name: 'Test' });
            const body = JSON.parse(response.body);

            expect(body.success).toBe(true);
            expect(body.data).toEqual({ id: '123', name: 'Test' });
        });

        it('should include message when provided', () => {
            const response = successResponse({ id: '123' }, { message: 'Operation successful' });
            const body = JSON.parse(response.body);

            expect(body.success).toBe(true);
            expect(body.message).toBe('Operation successful');
        });

        it('should include pagination when provided', () => {
            const pagination = { page: 1, limit: 10, total: 100, totalPages: 10, hasMore: true, hasPrev: false };
            const response = successResponse([], { pagination });
            const body = JSON.parse(response.body);

            expect(body.pagination).toEqual(pagination);
        });

        it('should have 200 status by default', () => {
            const response = successResponse({});
            expect(response.status).toBe(200);
        });

        it('should use custom status when provided', () => {
            const response = successResponse({}, { status: 201 });
            expect(response.status).toBe(201);
        });
    });

    describe('errorResponse', () => {
        it('should return an error response', () => {
            const response = errorResponse('Something went wrong');
            const body = JSON.parse(response.body);

            expect(body.success).toBe(false);
            expect(body.error).toBe('Something went wrong');
        });

        it('should have 500 status by default', () => {
            const response = errorResponse('Error');
            expect(response.status).toBe(500);
        });

        it('should use custom status when provided', () => {
            const response = errorResponse('Bad Request', { status: 400 });
            expect(response.status).toBe(400);
        });

        it('should include error code when provided', () => {
            const response = errorResponse('Error', { code: 'CUSTOM_ERROR' });
            const body = JSON.parse(response.body);

            expect(body.code).toBe('CUSTOM_ERROR');
        });

        it('should include details when provided', () => {
            const response = errorResponse('Validation failed', { details: { field: 'email' } });
            const body = JSON.parse(response.body);

            expect(body.details).toEqual({ field: 'email' });
        });
    });

    describe('createdResponse', () => {
        it('should return 201 status', () => {
            const response = createdResponse({ id: '123' });
            expect(response.status).toBe(201);
        });

        it('should include default message', () => {
            const response = createdResponse({});
            const body = JSON.parse(response.body);

            expect(body.message).toBe('Created successfully');
        });

        it('should include custom message', () => {
            const response = createdResponse({}, 'Custom created message');
            const body = JSON.parse(response.body);

            expect(body.message).toBe('Custom created message');
        });
    });

    describe('validationErrorResponse', () => {
        it('should return 400 status', () => {
            const response = validationErrorResponse('Invalid input');
            expect(response.status).toBe(400);
        });

        it('should include error details as string', () => {
            const response = validationErrorResponse('Email is required');
            const body = JSON.parse(response.body);

            expect(body.error).toBe('Validation failed');
            expect(body.details).toBe('Email is required');
        });

        it('should include error details as array', () => {
            const response = validationErrorResponse(['Email required', 'Password required']);
            const body = JSON.parse(response.body);

            expect(body.details).toEqual(['Email required', 'Password required']);
        });

        it('should include error details as object', () => {
            const response = validationErrorResponse({ email: 'Invalid', password: 'Too short' });
            const body = JSON.parse(response.body);

            expect(body.details).toEqual({ email: 'Invalid', password: 'Too short' });
        });
    });

    describe('unauthorizedResponse', () => {
        it('should return 401 status', () => {
            const response = unauthorizedResponse();
            expect(response.status).toBe(401);
        });

        it('should use custom message', () => {
            const response = unauthorizedResponse('Please login first');
            const body = JSON.parse(response.body);

            expect(body.error).toBe('Please login first');
        });
    });

    describe('notFoundResponse', () => {
        it('should return 404 status', () => {
            const response = notFoundResponse();
            expect(response.status).toBe(404);
        });

        it('should include resource name in message', () => {
            const response = notFoundResponse('Product');
            const body = JSON.parse(response.body);

            expect(body.error).toBe('Product not found');
        });
    });

    describe('tooManyRequestsResponse', () => {
        it('should return 429 status', () => {
            const response = tooManyRequestsResponse();
            expect(response.status).toBe(429);
        });

        it('should include Retry-After header when retryAfter is provided', () => {
            const response = tooManyRequestsResponse('Too many requests', 60);

            expect(response.headers.get('Retry-After')).toBe('60');
        });
    });
});
