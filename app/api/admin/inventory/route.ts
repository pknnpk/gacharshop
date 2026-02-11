
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import InventoryLog from '@/models/InventoryLog';
import { logAdminAction } from '@/lib/audit';
import Order from '@/models/Order';
import mongoose from 'mongoose';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return null;
    }
    return session.user;
}

export async function GET(req: NextRequest) {
    await connectToDatabase();
    const adminUser = await checkAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all products with inventory populated
        const products = await Product.find({})
            .populate('inventory.location')
            .sort({ updatedAt: -1 })
            .lean();

        return NextResponse.json(products);
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
        const { productId, locationId, quantity, type, reason } = body;

        if (!productId || quantity === undefined || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Initialize inventory array if needed
        if (!product.inventory) {
            product.inventory = [];
        }

        let change = 0;
        let beforeBalance = 0;
        let newBalance = 0;

        // If locationId is provided, update specific location
        if (locationId) {
            const locationIndex = product.inventory.findIndex(
                (inv: any) => inv.location.toString() === locationId
            );

            if (locationIndex > -1) {
                beforeBalance = product.inventory[locationIndex].quantity;
            }

            change = 0;
            newBalance = beforeBalance;

            if (type === 'set') {
                newBalance = quantity;
                change = newBalance - beforeBalance;
            } else if (type === 'add') {
                change = quantity;
                newBalance = beforeBalance + change;
            } else if (type === 'subtract') {
                change = -quantity;
                newBalance = beforeBalance + change;
            }

            if (newBalance < 0) {
                return NextResponse.json({ error: 'Insufficient stock at this location' }, { status: 400 });
            }

            // Update product inventory
            if (locationIndex > -1) {
                product.inventory[locationIndex].quantity = newBalance;
            } else {
                product.inventory.push({
                    location: locationId,
                    quantity: newBalance
                });
            }
        } else {
            // Backward compatibility or Global Stock Adjustment (e.g. from POSPOS without location)
            // Just update the main stock field if no location strategy is enforced
            beforeBalance = product.stock;

            if (type === 'set') {
                newBalance = quantity;
                change = newBalance - beforeBalance;
            } else if (type === 'add') {
                change = quantity;
                newBalance = beforeBalance + change;
            } else if (type === 'subtract') {
                change = -quantity;
                newBalance = beforeBalance + change;
            }
        }

        // Update total stock based on all locations + unassigned stock logic if any
        // For now, we sync total stock to be sum of all locations if inventory exists
        if (product.inventory.length > 0) {
            product.stock = product.inventory.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
        } else {
            // If no inventory locations, just use the calculated newBalance from the "Global" block
            // But wait, the Global block calculated newBalance based on product.stock
            if (!locationId) {
                product.stock = newBalance;
            }
        }

        await product.save();

        // Log to InventoryLog
        await InventoryLog.create({
            product: productId,
            change: change,
            beforeBalance: beforeBalance,
            afterBalance: newBalance,
            type: 'adjustment',
            reason: reason || 'Manual adjustment',
            referenceType: 'Manual',
            performedBy: adminUser.id,
            metadata: { locationId }
        });

        // Log to AuditLog
        await logAdminAction({
            action: 'ADJUST_INVENTORY',
            entity: 'Product',
            entityId: productId,
            performedBy: adminUser.id,
            details: { locationId, change, newBalance, reason },
            req
        });

        return NextResponse.json({
            success: true,
            newBalance,
            totalStock: product.stock
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
