import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
    // Check for forwarded IP (when behind proxy/load balancer)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    // Check for real IP (nginx proxy)
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback to unknown
    return 'unknown';
}

/**
 * Simple in-memory rate limiter for API routes
 * Use with Upstash Redis for production deployment
 */
export function createRateLimiter(requests: number, windowMs: number, keyPrefix: string = 'ratelimit') {
    return function rateLimitMiddleware(request: NextRequest): NextResponse | null {
        const ip = getClientIP(request);
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        let record = rateLimitStore.get(key);

        if (!record || record.resetTime < now) {
            // Start new window
            record = { count: 1, resetTime: now + windowMs };
            rateLimitStore.set(key, record);
        } else {
            record.count++;
        }

        // Set common headers
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', String(requests));
        response.headers.set('X-RateLimit-Remaining', String(Math.max(0, requests - record.count)));
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

        if (record.count > requests) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
                    'X-RateLimit-Limit': String(requests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(record.resetTime / 1000)),
                },
            });
        }

        return null; // Allow request to proceed
    };
}

// Default rate limiter: 100 requests per minute
export const defaultRateLimiter = createRateLimiter(100, 60 * 1000);

// Strict rate limiter for sensitive endpoints: 10 requests per minute
export const strictRateLimiter = createRateLimiter(10, 60 * 1000);
