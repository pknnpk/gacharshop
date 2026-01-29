import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import InventoryLog from '@/models/InventoryLog';
import mongoose from 'mongoose';

// Cron job secret for Vercel Cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
    // Verify CRON_SECRET from Authorization header
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow if no secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        // 1. Find all PENDING orders
        const pendingOrders = await Order.find({ status: 'reserved' }).populate('items.product');
        const now = new Date();
        const results = {
            processed: 0,
            expired: 0,
            errors: 0
        };

        for (const order of pendingOrders) {
            // Calculate expiry
            let minDuration = 60; // Default 60 mins
            let hasCustomDuration = false;

            for (const item of order.items) {
                if (item.product && typeof item.product.reservationDuration === 'number') {
                    if (!hasCustomDuration || item.product.reservationDuration < minDuration) {
                        minDuration = item.product.reservationDuration;
                        hasCustomDuration = true;
                    }
                }
            }

            const expiryTime = new Date(order.createdAt.getTime() + minDuration * 60000);

            if (now > expiryTime) {
                // EXPIRE ORDER
                results.processed++;

                const dbSession = await mongoose.startSession();
                dbSession.startTransaction();

                try {
                    // Update Order Status
                    order.status = 'cancelled';
                    order.statusHistory.push({
                        status: 'cancelled',
                        reason: `System: Payment timeout > ${minDuration} mins`,
                        timestamp: now,
                        changedBy: null
                    });
                    await order.save({ session: dbSession });

                    // Restore Stock
                    for (const item of order.items) {
                        const product = item.product;

                        // Use findOneAndUpdate to ensure we get the NEW balance for the log
                        const updatedProduct = await Product.findOneAndUpdate(
                            { _id: product._id },
                            { $inc: { stock: item.quantity } },
                            { session: dbSession, new: true }
                        );

                        // Audit Log
                        await InventoryLog.create([{
                            product: product._id,
                            change: item.quantity,
                            beforeBalance: updatedProduct.stock - item.quantity,
                            afterBalance: updatedProduct.stock,
                            type: 'cancel',
                            referenceType: 'Order',
                            referenceId: order._id.toString(),
                            reason: 'Payment Timeout',
                            performedBy: null // System
                        }], { session: dbSession });
                    }

                    results.expired++;
                    await dbSession.commitTransaction();

                } catch (err) {
                    await dbSession.abortTransaction();
                    console.error(`Failed to expire order ${order._id}:`, err);
                    results.errors++;
                } finally {
                    dbSession.endSession();
                }
            }
        }

        return NextResponse.json({ success: true, ...results });
    } catch (error: any) {
        console.error('Cron Job Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
