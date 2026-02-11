/**
 * API Response Standardization
 * 
 * Provides consistent response format for all API endpoints.
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        hasPrev: boolean;
    };
    metadata?: {
        requestId?: string;
        timestamp?: string;
        executionTime?: number;
    };
}

/**
 * Create a success response
 */
export function successResponse<T>(
    data: T,
    options?: {
        message?: string;
        status?: number;
        pagination?: ApiResponse['pagination'];
        metadata?: ApiResponse['metadata'];
    }
): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        ...(options?.message && { message: options.message }),
        ...(options?.pagination && { pagination: options.pagination }),
        ...(options?.metadata && { metadata: options.metadata })
    }, { status: options?.status || 200 });
}

/**
 * Create an error response
 */
export function errorResponse(
    message: string,
    options?: {
        status?: number;
        code?: string;
        details?: any;
    }
): NextResponse {
    const body: ApiResponse = {
        success: false,
        error: message,
        ...(options?.code && { code: options.code }),
        ...(options?.details && { details: options.details })
    };

    return NextResponse.json(body, { status: options?.status || 500 });
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(
    data: T,
    message: string = 'Created successfully'
): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        message
    }, { status: 201 });
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 });
}

/**
 * Create a validation error response (400)
 */
export function validationErrorResponse(
    errors: string | string[] | Record<string, string>
): NextResponse {
    return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errors
    }, { status: 400 });
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(
    message: string = 'Unauthorized'
): NextResponse {
    return NextResponse.json({
        success: false,
        error: message
    }, { status: 401 });
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
    message: string = 'Forbidden'
): NextResponse {
    return NextResponse.json({
        success: false,
        error: message
    }, { status: 403 });
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(
    resource: string = 'Resource'
): NextResponse {
    return NextResponse.json({
        success: false,
        error: `${resource} not found`
    }, { status: 404 });
}

/**
 * Create a too many requests response (429)
 */
export function tooManyRequestsResponse(
    message: string = 'Too many requests',
    retryAfter?: number
): NextResponse {
    const headers: Record<string, string> = {};
    if (retryAfter) {
        headers['Retry-After'] = String(retryAfter);
    }

    return NextResponse.json({
        success: false,
        error: message
    }, { status: 429, headers });
}
