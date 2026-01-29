
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import User from '@/models/User';
import InventoryLog from '@/models/InventoryLog'; // Import InventoryLog
import mongoose from 'mongoose'; // Import mongoose

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
