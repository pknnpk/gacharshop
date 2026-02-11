/**
 * Database Index Creation Script
 * 
 * Creates indexes for frequently queried fields to improve performance.
 * Run this script to set up optimal indexes for your MongoDB collections.
 */

import dbConnect from '../lib/db';
import mongoose from 'mongoose';

async function createIndexes() {
    console.log('🔧 Creating database indexes...\n');

    try {
        await dbConnect();

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        // Product indexes
        console.log('📦 Creating Product indexes...');
        await db.collection('products').createIndexes([
            { key: { status: 1 }, name: 'idx_product_status' },
            { key: { category: 1 }, name: 'idx_product_category' },
            { key: { slug: 1 }, unique: true, name: 'idx_product_slug_unique' },
            { key: { name: 'text', description: 'text' }, name: 'idx_product_text_search' },
            { key: { stock: 1 }, name: 'idx_product_stock' },
            { key: { price: 1 }, name: 'idx_product_price' },
            { key: { createdAt: -1 }, name: 'idx_product_created_at' },
            { key: { 'posposLastSyncAt': 1 }, name: 'idx_product_pospos_sync' }
        ]);
        console.log('✅ Product indexes created');

        // Order indexes
        console.log('📦 Creating Order indexes...');
        await db.collection('orders').createIndexes([
            { key: { user: 1, createdAt: -1 }, name: 'idx_order_user_created' },
            { key: { status: 1 }, name: 'idx_order_status' },
            { key: { createdAt: 1 }, name: 'idx_order_created_at' },
            { key: { status: 1, createdAt: 1 }, name: 'idx_order_status_created' },
            { key: { paymentId: 1 }, name: 'idx_order_payment_id' },
            { key: { beamTransactionId: 1 }, name: 'idx_order_beam_transaction' },
            { key: { 'trackingInfo.trackingNumber': 1 }, name: 'idx_order_tracking' },
            { key: { 'bankTransferInfo.verifiedAt': 1 }, name: 'idx_order_bank_verify' }
        ]);
        console.log('✅ Order indexes created');

        // User indexes
        console.log('📦 Creating User indexes...');
        await db.collection('users').createIndexes([
            { key: { email: 1 }, unique: true, name: 'idx_user_email_unique' },
            { key: { role: 1 }, name: 'idx_user_role' },
            { key: { providerId: 1, provider: 1 }, name: 'idx_user_provider' }
        ]);
        console.log('✅ User indexes created');

        // Cart indexes
        console.log('📦 Creating Cart indexes...');
        await db.collection('carts').createIndexes([
            { key: { user: 1 }, unique: true, name: 'idx_cart_user_unique' }
        ]);
        console.log('✅ Cart indexes created');

        // InventoryLog indexes
        console.log('📦 Creating InventoryLog indexes...');
        await db.collection('inventorylogs').createIndexes([
            { key: { product: 1, createdAt: -1 }, name: 'idx_inventory_log_product' },
            { key: { type: 1 }, name: 'idx_inventory_log_type' },
            { key: { referenceType: 1, referenceId: 1 }, name: 'idx_inventory_log_reference' }
        ]);
        console.log('✅ InventoryLog indexes created');

        // Category indexes
        console.log('📦 Creating Category indexes...');
        await db.collection('categories').createIndexes([
            { key: { slug: 1 }, unique: true, name: 'idx_category_slug_unique' },
            { key: { parent: 1 }, name: 'idx_category_parent' }
        ]);
        console.log('✅ Category indexes created');

        // Address indexes
        console.log('📦 Creating Address indexes...');
        await db.collection('addresses').createIndexes([
            { key: { user: 1 }, name: 'idx_address_user' }
        ]);
        console.log('✅ Address indexes created');

        console.log('\n🎉 All indexes created successfully!');

    } catch (error: any) {
        console.error('❌ Error creating indexes:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

// Run if called directly
createIndexes().then(() => {
    console.log('\n📋 Index creation complete. Consider running this script after deployment.');
    process.exit(0);
});

export { createIndexes };
