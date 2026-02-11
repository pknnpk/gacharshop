import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { createRateLimiter } from '@/lib/middleware/rateLimit';
import { debug, errorLog } from '@/lib/middleware/logger';

const rateLimitHandler = createRateLimiter(100, 60 * 1000);

export async function GET(request: NextRequest) {
    const rateLimitResponse = rateLimitHandler(request);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const categorySlug = searchParams.get('category');
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { status: 'active' };

        if (categorySlug) {
            const category = await Category.findOne({ slug: categorySlug });
            if (category) {
                query.category = category._id;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute queries
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category')
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        debug('Products fetched with pagination', {
            metadata: {
                page,
                limit,
                total,
                totalPages,
                category: categorySlug
            }
        });

        return NextResponse.json({
            success: true,
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error: any) {
        errorLog('Failed to fetch products', { error: error.message });
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
