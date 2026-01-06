
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Cart from '@/models/Cart';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';

// Helper to cleanup expired items in a cart
async function cleanupCart(cart: any) {
    let modified = false;
    let removedCount = 0;
    const now = new Date();

    const activeItems = [];

    for (const item of cart.items) {
        if (item.expiresAt && new Date(item.expiresAt) < now) {
            // Expired: Return stock
            await Product.findByIdAndUpdate(item.product._id || item.product, {
                $inc: { stock: item.quantity }
            });
            modified = true;
            removedCount += 1;
        } else {
            activeItems.push(item);
        }
    }

    if (modified) {
        cart.items = activeItems;
        await cart.save();
    }

    return { modified, removedCount };
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let cart = await Cart.findOne({ user: user._id }).populate('items.product');

    if (!cart) {
        return NextResponse.json({ items: [] });
    }

    // Cleanup expired items before returning
    const { removedCount } = await cleanupCart(cart);

    // Re-fetch or use cleaned cart (since we modified it in place, it's fine, but needed repopulate if we saved?)
    // Actually cart.save() in cleanupCart might strip population if strict? Mongoose usually handles it ok, 
    // but to be safe let's ensure we return valid populated data. 
    // If modified, the 'activeItems' array has populated products if they were populated before.

    return NextResponse.json({
        items: cart.items,
        removedCount // Inform client
    });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { items: incomingItems } = body; // These are just { product: ID, quantity }

    if (!Array.isArray(incomingItems)) {
        return NextResponse.json({ error: 'Invalid items format' }, { status: 400 });
    }

    // Get current cart
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
        cart = await Cart.create({ user: user._id, items: [] });
    }

    // 1. Cleanup expired items first so we have accurate stock/cart state
    await cleanupCart(cart);

    // 2. Calculate Diff and Process
    // We need to map incoming request to current state.
    // Complexity: Incoming is the "Desired State".

    // Create a map of current items for easy lookup
    const currentMap = new Map();
    cart.items.forEach((item: any) => {
        currentMap.set(item.product.toString(), item);
    });

    const newItems = [];

    for (const incoming of incomingItems) {
        const productId = incoming.product;
        // Ensure quantity is positive
        const newQty = Math.max(0, incoming.quantity);
        if (newQty === 0) continue; // Remove item

        const currentItem = currentMap.get(productId);
        const currentQty = currentItem ? currentItem.quantity : 0;
        const delta = newQty - currentQty;

        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 404 });
        }

        if (delta > 0) {
            // A. Quota Check
            if (product.quotaLimit > 0) {
                // Count how many bought
                // Aggregation to sum quantities in Orders for this user and product
                // Note: This matches "items.product" in Order Schema
                const orders = await Order.find({
                    user: user._id,
                    'items.product': productId
                });

                let boughtCount = 0;
                orders.forEach(order => {
                    const item = order.items.find((i: any) => i.product.toString() === productId);
                    if (item) boughtCount += item.quantity;
                });

                if (boughtCount + newQty > product.quotaLimit) {
                    return NextResponse.json({
                        error: `Quota exceeded for ${product.name}. Limit: ${product.quotaLimit}, Bought: ${boughtCount}, In Cart: ${newQty}`
                    }, { status: 400 });
                }
            }

            // B. Stock Check & Reservation
            if (product.stock < delta) {
                return NextResponse.json({
                    error: `Not enough stock for ${product.name}. Available: ${product.stock}`
                }, { status: 400 });
            }

            // Reserve (Decrement)
            product.stock -= delta;
            await product.save();
        }
        else if (delta < 0) {
            // C. Release Stock
            product.stock += Math.abs(delta);
            await product.save();
        }

        // D. Calculate Expiration
        // Refreshes expiration on update? Or keeps original?
        // Requirement: "timeout starts when product is selected". 
        // If I update qty, does it reset timer? Usually yes, activity keeps it alive.
        // Let's reset expiresAt to Now + Timeout
        const timeoutMinutes = product.reservationTimeout || 15;
        const expiresAt = new Date(Date.now() + timeoutMinutes * 60000);

        newItems.push({
            product: productId,
            quantity: newQty,
            expiresAt
        });

        // Remove from currentMap to track processed items
        currentMap.delete(productId);
    }

    // 3. Handle Removed Items (Items in DB but not in Request)
    // If an item was in currentMap but NOT in incomingItems, it means it was removed by client.
    // We must release its stock.
    for (const [productId, item] of currentMap.entries()) {
        await Product.findByIdAndUpdate(productId, {
            $inc: { stock: item.quantity }
        });
    }

    // 4. Save Cart
    cart.items = newItems;
    await cart.save();

    // Populate for return
    await cart.populate('items.product');

    return NextResponse.json({ items: cart.items });
}
