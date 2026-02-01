import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { verifyBeamWebhookSignature, createBeamRefund } from '@/lib/beam';
import { mockPOSPOSSync } from '@/lib/pospos';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-beam-signature') || '';
        const bodyString = JSON.stringify(body);

        // 1. Security Check
        const isValid = await verifyBeamWebhookSignature(signature, bodyString);
        if (!isValid) {
            console.error('[Beam Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 2. Parse Event
        // Beam webhook payload structure:
        // { event_type: 'payment.success', transaction_id: '...', order_id: '...', status: '...', ... }
        const eventType = body.event_type || body.type;
        const { transaction_id, order_id, status, amount } = body;

        console.log(`[Beam Webhook] Received event: ${eventType} for order: ${order_id}`);

        if (!order_id) {
            return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
        }

        await dbConnect();

        // 3. Handle different event types
        switch (eventType) {
            case 'payment.success':
            case 'transaction.succeeded':
                return await handlePaymentSuccess(order_id, transaction_id, body);

            case 'payment.failed':
            case 'transaction.failed':
                return await handlePaymentFailed(order_id, body);

            case 'refund.completed':
            case 'refund.succeeded':
                return await handleRefundCompleted(order_id, body);

            case 'refund.failed':
                return await handleRefundFailed(order_id, body);

            default:
                console.log(`[Beam Webhook] Unhandled event type: ${eventType}`);
                return NextResponse.json({ message: `Event ${eventType} ignored` });
        }

    } catch (error: any) {
        console.error('Beam Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(orderId: string, transactionId: string, body: any) {
    const order = await Order.findById(orderId);
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If already paid, skip
    if (order.status === 'paid' || order.status === 'shipped' || order.status === 'completed') {
        return NextResponse.json({ message: 'Order already processed' });
    }

    // Update order
    order.status = 'paid';
    order.beamTransactionId = transactionId || order.beamTransactionId;
    order.statusHistory.push({
        status: 'paid',
        reason: 'Payment confirmed via Beam Webhook',
        timestamp: new Date(),
        changedBy: null // System
    });

    await order.save();

    // Sync to POSPOS (non-blocking)
    syncOrderToPOSPOS(order).catch(err => {
        console.error('[Beam Webhook] POSPOS sync failed:', err);
    });

    console.log(`[Beam Webhook] Order ${orderId} marked as PAID`);
    return NextResponse.json({ message: 'Order updated to PAID' });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(orderId: string, body: any) {
    const order = await Order.findById(orderId);
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only process if still in reserved state
    if (order.status === 'reserved') {
        order.status = 'cancelled';
        order.statusHistory.push({
            status: 'cancelled',
            reason: `Payment failed: ${body.failure_reason || 'Unknown'}`,
            timestamp: new Date(),
            changedBy: null // System
        });

        // Restore stock
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: item.quantity } },
                    { session: dbSession }
                );
            }
            await dbSession.commitTransaction();
        } catch (err) {
            await dbSession.abortTransaction();
            throw err;
        } finally {
            dbSession.endSession();
        }

        await order.save();
        console.log(`[Beam Webhook] Order ${orderId} cancelled due to payment failure`);
    }

    return NextResponse.json({ message: 'Order cancelled' });
}

/**
 * Handle completed refund
 */
async function handleRefundCompleted(orderId: string, body: any) {
    const order = await Order.findById(orderId);
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    order.status = 'refunded';
    order.refundInfo = {
        refundId: body.refund_id || body.refundTransactionId,
        refundedAt: new Date(),
        refundAmount: body.amount || order.totalAmount,
        refundReason: body.reason || 'Customer cancellation'
    };
    order.statusHistory.push({
        status: 'refunded',
        reason: 'Refund completed via Beam Webhook',
        timestamp: new Date(),
        changedBy: null // System
    });

    await order.save();
    console.log(`[Beam Webhook] Order ${orderId} marked as REFUNDED`);
    return NextResponse.json({ message: 'Order updated to REFUNDED' });
}

/**
 * Handle failed refund
 */
async function handleRefundFailed(orderId: string, body: any) {
    console.error(`[Beam Webhook] Refund failed for order ${orderId}:`, body.failure_reason);
    // Could notify admin here
    return NextResponse.json({ message: 'Refund failed noted' });
}

/**
 * Sync order to POSPOS system
 */
async function syncOrderToPOSPOS(order: any) {
    for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.sku) {
            await mockPOSPOSSync({
                sku: product.sku,
                quantity: item.quantity,
                action: 'subtract',
                source: 'web_sale',
                referenceId: order._id.toString()
            });
        }
    }

    // Update order sync status
    order.posposSyncStatus = 'synced';
    order.posposSyncAt = new Date();
    await order.save();
}
