
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

        for (const item of cart.items) {
            const product = item.product;

            // --- ATOMIC STOCK DEDUCTION (BR-01) ---
            // Find product with enough stock AND decrease it in one go.
            // If stock < quantity, this returns null.
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { session: dbSession, new: true }
            );

            if (!updatedProduct) {
                // Stock check failed
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
                // referenceId: Will be updated with Order ID later? 
                // Actually we don't have order ID yet.
                // We can set it after order creation if we want strict linking, 
                // OR we generate a placeholder ID. 
                // Let's generate a temporary ID or just use "Pending" and update it?
                // Better: Order.create returns the ID. We can use it if we construct the object first?
                // Mongoose create returns the doc.
                // Let's rely on the order-creation step below. 
                // We'll leave referenceId empty for a ms or use a placeholder string for now.
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
        const [order] = await Order.create([{
            user: user._id,
            items: orderItems,
            totalAmount,
            status: 'pending',
            statusHistory: [{
                status: 'pending',
                reason: 'Order placed by customer',
                timestamp: new Date(),
                changedBy: user._id
            }],
            address,
            paymentId: 'pending_' + Date.now()
        }], { session: dbSession });

        // Update logs with Order ID (Optional but cleaner for BR-02)
        // We find the logs we just made? Or we could generate the ObjectId manually before creating.
        // For simplicity, let's update them:
        await InventoryLog.updateMany(
            { reason: 'Customer Checkout', performedBy: user._id, createdAt: { $gt: new Date(Date.now() - 5000) }, referenceId: { $exists: false } },
            { $set: { referenceId: order._id.toString() } },
            { session: dbSession }
        );


        // Clear Cart
        cart.items = [];
        await cart.save({ session: dbSession });

        // Commit Transaction
        await dbSession.commitTransaction();
        dbSession.endSession();

        return NextResponse.json({
            message: 'Order created successfully',
            orderId: order._id
        });

    } catch (error: any) {
        // Rollback EVERYTHING on any error
        await dbSession.abortTransaction();
        dbSession.endSession();

        console.error('Order creation error:', error);

        const errorMessage = error.message || 'Internal Server Error';
        // Return 400 for stock issues, 500 for others
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
