
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import StockHistory from '@/models/StockHistory';
import InventoryLog from '@/models/InventoryLog';
import { logAdminAction } from '@/lib/audit';
import Order from '@/models/Order';

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
        const { searchParams } = new URL(req.url);
        const locationId = searchParams.get('locationId');

        let query = {};
        if (locationId) {
            query = { 'inventory.location': locationId };
        }

        // Fetch products
        const products = await Product.find(query)
            .populate('inventory.location')
            .sort({ updatedAt: -1 })
            .lean();

        // Calculate reserved stock globally (as orders aren't location-specific yet)
        const activeOrders = await Order.find({
            status: { $in: ['reserved', 'paid'] }
        }).select('items');

        const reservedCounts: Record<string, number> = {};
        activeOrders.forEach(order => {
            order.items.forEach((item: any) => {
                const pid = item.product.toString();
                reservedCounts[pid] = (reservedCounts[pid] || 0) + item.quantity;
            });
        });

        const productsWithStock = products.map((p: any) => {
            const reserved = reservedCounts[p._id.toString()] || 0;
            const totalStock = p.stock || 0;

            let locationStock = 0;
            if (locationId && p.inventory) {
                const inv = p.inventory.find((i: any) => i.location._id?.toString() === locationId || i.location?.toString() === locationId);
                locationStock = inv ? inv.quantity : 0;
            }

            return {
                ...p,
                totalStock,
                locationStock: locationId ? locationStock : undefined,
                reserved,
                // If filtered by location, 'available' is checking physical stock there. 
                // Since reservations are global, showing simple on-hand is safer for now.
                available: totalStock - reserved
            };
        });

        return NextResponse.json(productsWithStock);
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

        if (type === 'transfer') {
            const { targetLocationId } = body;
            if (!targetLocationId) {
                return NextResponse.json({ error: 'Target location required' }, { status: 400 });
            }

            // Find source index
            const sourceIndex = product.inventory.findIndex(
                (inv: any) => inv.location.toString() === locationId
            );

            if (sourceIndex === -1 || product.inventory[sourceIndex].quantity < quantity) {
                return NextResponse.json({ error: 'Insufficient stock at source location' }, { status: 400 });
            }

            // Find target index
            let targetIndex = product.inventory.findIndex(
                (inv: any) => inv.location.toString() === targetLocationId
            );

            // Deduct from source
            const sourceBefore = product.inventory[sourceIndex].quantity;
            product.inventory[sourceIndex].quantity -= quantity;

            // Add to target
            let targetBefore = 0;
            if (targetIndex > -1) {
                targetBefore = product.inventory[targetIndex].quantity;
                product.inventory[targetIndex].quantity += quantity;
            } else {
                product.inventory.push({
                    location: targetLocationId,
                    quantity: quantity
                });
                targetIndex = product.inventory.length - 1;
            }

            await product.save();

            // Log History (Dual Entry)
            const timestamp = new Date();
            await StockHistory.create([
                {
                    product: productId,
                    location: locationId,
                    user: adminUser.id,
                    action: 'transfer',
                    change: -quantity,
                    previousStock: sourceBefore,
                    newStock: sourceBefore - quantity,
                    reason: `Transfer to ${targetLocationId} - ${reason || ''}`,
                    timestamp
                },
                {
                    product: productId,
                    location: targetLocationId,
                    user: adminUser.id,
                    action: 'receive',
                    change: quantity,
                    previousStock: targetBefore,
                    newStock: targetBefore + quantity,
                    reason: `Transfer from ${locationId} - ${reason || ''}`,
                    timestamp
                }
            ]);

            return NextResponse.json({ success: true, message: 'Transfer successful' });
        }

        // Initialize inventory array if needed
        if (!product.inventory) {
            product.inventory = [];
        }

        let change = 0;
        let beforeBalance = 0;
        let newBalance = 0;

        // If locationId is provided, update specific location (EXISTING LOGIC)
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

        // Create StockHistory Record
        try {
            await StockHistory.create({
                product: productId,
                location: locationId || undefined,
                user: adminUser.id,
                action: 'adjustment',
                change: change,
                previousStock: beforeBalance,
                newStock: newBalance,
                reason: reason || 'Manual adjustment',
                timestamp: new Date()
            });
        } catch (historyError) {
            console.error('Failed to create history record:', historyError);
        }

        return NextResponse.json({
            success: true,
            newBalance,
            totalStock: product.stock
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
