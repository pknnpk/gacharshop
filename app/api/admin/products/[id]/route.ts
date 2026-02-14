
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category'; // Register Category model BEFORE Product
import Product from '@/models/Product';
import { logAdminAction } from '@/lib/audit';
import StockHistory from '@/models/StockHistory';
import Order from '@/models/Order';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
}

// Helper to safely get ID from params
async function getId(params: any): Promise<string> {
    const p = await params;
    return p.id;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    if (!await checkAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);
        const product = await Product.findById(id).populate('category');
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json(product);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);
        const body = await req.json();
        const { _id, ...updateData } = body; // Exclude _id from update

        // Prevent Slug/SKU/Barcode duplication
        if (updateData.slug || updateData.sku || updateData.barcode) {
            const checks = [];
            if (updateData.slug) checks.push({ slug: updateData.slug });
            if (updateData.sku) checks.push({ sku: updateData.sku });
            if (updateData.barcode) checks.push({ barcode: updateData.barcode });

            if (checks.length > 0) {
                const existing = await Product.findOne({
                    $and: [
                        { _id: { $ne: id } },
                        { $or: checks }
                    ]
                });
                if (existing) {
                    if (updateData.slug && existing.slug === updateData.slug) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
                    if (updateData.sku && existing.sku === updateData.sku) return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
                    if (updateData.barcode && existing.barcode === updateData.barcode) return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 });
                }
            }
        }

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        await logAdminAction({
            action: 'UPDATE_PRODUCT',
            entity: 'Product',
            entityId: id,
            performedBy: adminUser.id,
            details: updateData,
            req
        });

        return NextResponse.json(product);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = await getId(params);
        // Safety checks
        const hasHistory = await StockHistory.exists({ product: id });
        if (hasHistory) {
            return NextResponse.json({ error: 'Cannot delete product with stock history. Archive it instead.' }, { status: 400 });
        }

        await Product.findByIdAndDelete(id);

        await logAdminAction({
            action: 'DELETE_PRODUCT',
            entity: 'Product',
            entityId: id,
            performedBy: adminUser.id,
            details: {},
            req
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
