const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Fallback

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
}

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function check() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const products = await Product.find({}).lean();
        console.log(`Found ${products.length} products`);

        if (products.length > 0) {
            console.log('Sample Product keys:', Object.keys(products[0]));
            console.log('--- Sample Data ---');
            products.forEach(p => {
                console.log(`ID: ${p._id}`);
                console.log(`Name: ${p.name}`);
                console.log(`SKU: ${p.sku || 'MISSING'}`);
                console.log(`Barcode: ${p.barcode || 'MISSING'}`);
                console.log(`Cost: ${p.costPrice || 'MISSING'}`);
                console.log(`Dimensions: ${JSON.stringify(p.dimensions) || 'MISSING'}`);
                console.log('---');
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
