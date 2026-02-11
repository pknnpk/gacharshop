
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { logAdminAction } from '@/lib/audit';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
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
        if (!body.name || !body.sku || !body.price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingProduct = await Product.findOne({
            $or: [{ sku: body.sku }, { slug: body.slug }]
        });

        if (existingProduct) {
            return NextResponse.json({ error: 'Product with this SKU or Slug already exists' }, { status: 400 });
        }

        const product = await Product.create(body);

        await logAdminAction({
            action: 'CREATE_PRODUCT',
            entity: 'Product',
            entityId: product._id.toString(),
            performedBy: adminUser.id,
            details: { name: body.name, sku: body.sku },
            req
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Missing Product ID' }, { status: 400 });
        }

        // prevent updating SKU to a duplicate
        if (updateData.sku) {
            const existing = await Product.findOne({ sku: updateData.sku, _id: { $ne: _id } });
            if (existing) {
                return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
            }
        }

        const product = await Product.findByIdAndUpdate(_id, updateData, { new: true });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        await logAdminAction({
            action: 'UPDATE_PRODUCT',
            entity: 'Product',
            entityId: _id,
            performedBy: adminUser.id,
            details: updateData,
            req
        });

        return NextResponse.json(product);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
