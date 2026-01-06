
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import User from '@/models/User';

export async function POST(req: Request) {
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

        const body = await req.json();
        const { address } = body;

        // Get Cart
        const cart = await Cart.findOne({ user: user._id }).populate('items.product');

        if (!cart || cart.items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // Calculate total and verify stock
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = item.product;

            // Check stock again (double check)
            if (product.stock < item.quantity) {
                return NextResponse.json({ error: `Not enough stock for ${product.name}` }, { status: 400 });
            }

            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price
            });

            totalAmount += product.price * item.quantity;

            // Decrease Stock
            await Product.findByIdAndUpdate(product._id, {
                $inc: { stock: -item.quantity }
            });
        }

        // Create Order
        const order = await Order.create({
            user: user._id,
            items: orderItems,
            totalAmount,
            status: 'pending',
            address,
            paymentId: 'pending_' + Date.now() // Placeholder
        });

        // Clear Cart
        cart.items = [];
        await cart.save();

        return NextResponse.json({
            message: 'Order created successfully',
            orderId: order._id
        });

    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
