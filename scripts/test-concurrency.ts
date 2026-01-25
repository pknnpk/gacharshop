
import mongoose from 'mongoose';
import Product from '../models/Product';
import InventoryLog from '../models/InventoryLog';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable');
    process.exit(1);
}

async function runTest() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected.');

    // 1. Setup Data
    const productName = 'Test Product ' + Date.now();
    const product = await Product.create({
        name: productName,
        slug: 'test-product-' + Date.now(),
        description: 'Test',
        price: 100,
        stock: 1, // CRITICAL: Only 1 in stock
        category: new mongoose.Types.ObjectId(), // Fake ID
        status: 'active'
    });

    console.log(`Created test product: ${product.name} with Stock: ${product.stock}`);

    // 2. Define the "Buy" function mimicking the API logic
    const attemptBuy = async (userId: string, quantity: number) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Atomic check and update
            const updated = await Product.findOneAndUpdate(
                { _id: product._id, stock: { $gte: quantity } },
                { $inc: { stock: -quantity } },
                { session, new: true }
            );

            if (!updated) {
                throw new Error('Out of stock');
            }

            // Create Log
            await InventoryLog.create([{
                product: product._id,
                change: -quantity,
                beforeBalance: updated.stock + quantity,
                afterBalance: updated.stock,
                type: 'sale',
                referenceType: 'Order',
                reason: 'Concurrency Test',
                performedBy: new mongoose.Types.ObjectId(), // Fake user
            }], { session });

            await session.commitTransaction();
            console.log(`User ${userId} SUCCESS`);
            return true;
        } catch (error: any) {
            await session.abortTransaction();
            console.log(`User ${userId} FAILED: ${error.message}`);
            return false;
        } finally {
            session.endSession();
        }
    };

    // 3. Run concurrently
    console.log('Starting 5 concurrent buy attempts...');
    const results = await Promise.all([
        attemptBuy('User1', 1),
        attemptBuy('User2', 1),
        attemptBuy('User3', 1),
        attemptBuy('User4', 1),
        attemptBuy('User5', 1),
    ]);

    // 4. Verify
    const successCount = results.filter(r => r === true).length;
    const failCount = results.filter(r => r === false).length;

    console.log('--------------------------------');
    console.log(`Total Attempts: ${results.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    const finalProduct = await Product.findById(product._id);
    console.log(`Final Stock: ${finalProduct?.stock}`);

    if (successCount === 1 && finalProduct?.stock === 0) {
        console.log('✅ TEST PASSED: Only 1 user got the item.');
    } else {
        console.error('❌ TEST FAILED: Discrepancy detected!');
    }

    // Cleanup
    await Product.deleteOne({ _id: product._id });
    // await InventoryLog.deleteMany({ product: product._id }); // Optional: keep logs for inspection

    await mongoose.disconnect();
}

runTest().catch(console.error);
