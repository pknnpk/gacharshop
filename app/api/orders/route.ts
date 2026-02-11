
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import User from '@/models/User';
import InventoryLog from '@/models/InventoryLog';
import mongoose from 'mongoose';
import { createBeamRefund } from '@/lib/beam';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const user = await User.findOne({ email: session.user.email }).session(dbSession);
        if (!user) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        const { address } = body;

        // Get Cart
        const cart = await Cart.findOne({ user: user._id }).populate('items.product').session(dbSession);

        if (!cart || cart.items.length === 0) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // Calculate total and verify stock
        let totalAmount = 0;
        const orderItems = [];

        // Pre-generate Order ID for logging linkage
        const orderId = new mongoose.Types.ObjectId();

        for (const item of cart.items) {
            const product = item.product;

            // --- ATOMIC STOCK DEDUCTION (BR-01) ---
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { session: dbSession, new: true }
            );

            if (!updatedProduct) {
                throw new Error(`Not enough stock for ${product.name}`);
            }

            // --- INVENTORY AUDIT TRAIL (BR-02) ---
            await InventoryLog.create([{
                product: product._id,
                change: -item.quantity,
                beforeBalance: updatedProduct.stock + item.quantity,
                afterBalance: updatedProduct.stock,
                type: 'sale',
                referenceType: 'Order',
                referenceId: orderId.toString(), // Link to the pre-generated Order ID
                reason: 'Customer Checkout',
                performedBy: user._id,
                metadata: {
                    address: address
                }
            }], { session: dbSession });


            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price
            });

            totalAmount += product.price * item.quantity;
        }

        // --- ORDER CREATION (BR-03) ---
        // Use the pre-generated ID
        const [order] = await Order.create([{
            _id: orderId,
            user: user._id,
            items: orderItems,
            totalAmount,
            status: 'reserved', // RESERVED_PAYMENT
            statusHistory: [{
                status: 'reserved',
                reason: 'Order placed by customer',
                timestamp: new Date(),
                changedBy: user._id
            }],
            address,
            paymentId: 'pending' // Placeholder, updated if needed
        }], { session: dbSession });

        // Clear Cart
        cart.items = [];
        await cart.save({ session: dbSession });

        // Commit Transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        // --- BEAM INTEGRATION ---
        // Post-transaction: Generate Beam Session
        // We do this AFTER commit to ensure we don't hold the DB lock while talking to external API.
        // If Beam fails, the order remains PENDING_PAYMENT, which is fine.
        // The user can retry payment or the order will expire.

        // Import dynamically to avoid require cycles if any, or just standard import
        const { createBeamCheckoutSession } = await import('@/lib/beam');

        let paymentUrl = '';
        try {
            const beamSession = await createBeamCheckoutSession(order._id.toString(), totalAmount, user.email);
            paymentUrl = beamSession.url;

            // Optional: Update order with Beam metadata if needed (outside the main transaction)
            // await Order.findByIdAndUpdate(order._id, { paymentId: beamSession.token });
        } catch (beamError) {
            console.error('Beam session creation failed:', beamError);
            // We return the orderId but no URL, frontend should handle this (e.g. show retry button)
        }

        return NextResponse.json({
            message: 'Order created successfully',
            orderId: order._id,
            paymentUrl: paymentUrl
        });

    } catch (error: any) {
        await dbSession.abortTransaction();
        dbSession.endSession();

        console.error('Order creation error:', error);

        const errorMessage = error.message || 'Internal Server Error';
        const status = errorMessage.includes('Not enough stock') ? 400 : 500;

        return NextResponse.json({ error: errorMessage }, { status });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const orders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(orders);

    } catch (error) {
        console.error('Fetch orders error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Cancel an order and trigger refund if payment was made
 */
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('orderId');
        const reason = searchParams.get('reason') || 'Customer requested cancellation';

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const order = await Order.findOne({ _id: orderId, user: user._id });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ['reserved', 'paid'];
        if (!cancellableStatuses.includes(order.status)) {
            return NextResponse.json({
                error: `Cannot cancel order in ${order.status} status`
            }, { status: 400 });
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // Handle refund if order was paid
            if (order.status === 'paid' && order.beamTransactionId) {
                console.log(`[Order Cancel] Triggering refund for order ${orderId}`);

                // Call Beam refund API
                const refundResult = await createBeamRefund(
                    order.beamTransactionId,
                    order.totalAmount,
                    reason
                );

                if (refundResult.success) {
                    order.status = 'refunded';
                    order.refundInfo = {
                        refundId: refundResult.refundId,
                        refundedAt: new Date(),
                        refundAmount: order.totalAmount,
                        refundReason: reason
                    };
                } else {
                    // Refund failed, still cancel but mark as needing manual review
                    console.error(`[Order Cancel] Refund failed for order ${orderId}:`, refundResult.error);
                    order.status = 'cancelled';
                    order.refundInfo = {
                        refundId: undefined,
                        refundedAt: undefined,
                        refundAmount: 0,
                        refundReason: `Refund failed: ${refundResult.error}. Manual review required.`
                    };
                }
            } else {
                order.status = 'cancelled';
            }

            // Add to status history
            order.statusHistory.push({
                status: order.status,
                reason: reason,
                timestamp: new Date(),
                changedBy: user._id
            });

            await order.save({ session: dbSession });

            // Restore stock - use bulk operations to avoid N+1 queries
            const productRestores = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { stock: item.quantity } }
                }
            }));

            if (productRestores.length > 0) {
                await Product.bulkWrite(productRestores, { session: dbSession });
            }

            // Get updated products for audit log
            const updatedProducts = await Product.find({ _id: { $in: order.items.map(i => i.product) } }).session(dbSession);
            const productMap = new Map(updatedProducts.map(p => [p._id.toString(), p]));

            // Log inventory changes
            for (const item of order.items) {
                const product = productMap.get(item.product.toString());
                if (product) {
                    await InventoryLog.create([{
                        product: product._id,
                        change: item.quantity,
                        beforeBalance: product.stock - item.quantity,
                        afterBalance: product.stock,
                        type: 'cancel',
                        referenceType: 'Order',
                        referenceId: order._id.toString(),
                        reason: 'Order cancelled - stock restored',
                        performedBy: user._id
                    }], { session: dbSession });
                }
            }

            await dbSession.commitTransaction();
            dbSession.endSession();

            console.log(`[Order Cancel] Order ${orderId} cancelled successfully`);
            return NextResponse.json({
                message: 'Order cancelled successfully',
                order: {
                    id: order._id,
                    status: order.status,
                    refundId: order.refundInfo?.refundId
                }
            });

        } catch (err) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw err;
        }

    } catch (error: any) {
        console.error('Cancel order error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
