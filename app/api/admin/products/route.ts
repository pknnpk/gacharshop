
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category'; // Register Category model BEFORE Product
import Product from '@/models/Product';
import slugify from 'slugify';
import { logAdminAction } from '@/lib/audit';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
}

export async function GET(req: NextRequest) {
    await connectToDatabase();
    if (!await checkAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status');
        const category = searchParams.get('category');

        const query: any = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (category) query.category = category;

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('category', 'name')
                .lean(),
            Product.countDocuments(query)
        ]);

        return NextResponse.json({
            products,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Basic validation
        if (!body.name || !body.price || !body.category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Auto-generate slug if not provided
        let slug = body.slug;
        if (!slug) {
            slug = slugify(body.name, { lower: true, strict: true });
        }

        // Check for existing slug, SKU, or Barcode
        const checks: any[] = [{ slug }];
        if (body.sku) checks.push({ sku: body.sku });
        if (body.barcode) checks.push({ barcode: body.barcode });

        const existing = await Product.findOne({
            $or: checks
        });

        if (existing) {
            if (existing.slug === slug) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
            if (body.sku && existing.sku === body.sku) return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
            if (body.barcode && existing.barcode === body.barcode) return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 });
        }

        const product = await Product.create({
            ...body,
            slug
        });

        await logAdminAction({
            action: 'CREATE_PRODUCT',
            entity: 'Product',
            entityId: product._id.toString(),
            performedBy: adminUser.id,
            details: { name: body.name, sku: body.sku },
            req
        });

        return NextResponse.json({ success: true, product }, { status: 201 });

    } catch (error: any) {
        // Handle duplicate key error standard from Mongo
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Duplicate field value entered' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
