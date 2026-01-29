import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import InventoryLog from '@/models/InventoryLog';
import User from '@/models/User';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const admin = await User.findOne({ email: session.user.email });

        // Strict Admin Check
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { productId, change, reason } = body;

        // Input validation
        if (!productId || typeof change !== 'number' || change === 0) {
            return NextResponse.json({ error: 'Invalid input: productId, change (non-zero number), and reason are required' }, { status: 400 });
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // Check constraint: Cannot remove more than available
            if (change < 0) {
                const product = await Product.findById(productId).session(dbSession);
                if (!product) throw new Error('Product not found');
                if (product.stock + change < 0) {
                    throw new Error('Insufficient stock to remove');
                }
            }

            const updatedProduct = await Product.findOneAndUpdate(
                { _id: productId },
                { $inc: { stock: change } },
                { session: dbSession, new: true }
            );

            if (!updatedProduct) {
                throw new Error('Product not found during update');
            }

            // Log
            await InventoryLog.create([{
                product: productId,
                change: change,
                beforeBalance: updatedProduct.stock - change,
                afterBalance: updatedProduct.stock,
                type: 'adjustment',
                referenceType: 'Manual',
                reason: reason || 'Admin Manual Adjustment',
                performedBy: admin._id
            }], { session: dbSession });

            await dbSession.commitTransaction();

            return NextResponse.json({
                success: true,
                newStock: updatedProduct.stock
            });

        } catch (err: any) {
            await dbSession.abortTransaction();
            return NextResponse.json({ error: err.message }, { status: 400 });
        } finally {
            dbSession.endSession();
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        // Verify admin role
        const admin = await User.findOne({ email: session.user.email });
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 1. Get all products (Available Stock)
        const products = await Product.find({}).sort({ updatedAt: -1 }).lean();

        // 2. Get all RESERVED orders to calculate "Reserved"
        const pendingOrders = await Order.find({ status: 'reserved' }).populate('items.product').lean();

        // Map reserved counts by Product ID
        const reservedMap: Record<string, number> = {};

        for (const order of pendingOrders) {
            for (const item of order.items) {
                // @ts-ignore
                const pId = item.product?._id?.toString() || item.product?.toString();
                if (pId) {
                    reservedMap[pId] = (reservedMap[pId] || 0) + item.quantity;
                }
            }
        }

        // 3. Merge Data
        const inventoryData = products.map(p => {
            const reserved = reservedMap[p._id.toString()] || 0;
            const available = p.stock;

            return {
                _id: p._id,
                name: p.name,
                sku: p.slug,
                totalStock: available + reserved,
                reserved: reserved,
                available: available,
                image: p.images[0]
            };
        });

        return NextResponse.json(inventoryData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
