const mongoose = require('mongoose');
const slugify = require('slugify'); // Ensure slugify is available or mock it
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
}

// Define Schema to allow updates
const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

function generateSKU(name, index) {
    // Simple SKU generation
    const prefix = name.substring(0, 3).toUpperCase();
    return `${prefix}-${String(index + 1).padStart(4, '0')}`;
}

function generateBarcode() {
    // Simple EAN-13 like generator
    let barcode = '885'; // Thailand prefix
    for (let i = 0; i < 9; i++) {
        barcode += Math.floor(Math.random() * 10);
    }
    // Check digit calculation omitted for simplicity in dummy data
    barcode += Math.floor(Math.random() * 10);
    return barcode;
}

async function backfill() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const products = await Product.find({});
        console.log(`Found ${products.length} products to update`);

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const updates = {};

            // SKU
            if (!p.sku) {
                updates.sku = generateSKU(p.name, i);
            }

            // Barcode
            if (!p.barcode) {
                updates.barcode = generateBarcode();
            }

            // Cost Price (approx 70% of price)
            if (!p.costPrice && p.price) {
                updates.costPrice = Math.floor(p.price * 0.7);
            }

            // Dimensions
            if (!p.dimensions || !p.dimensions.length) {
                updates.dimensions = {
                    length: 10,
                    width: 10,
                    height: 10
                };
            }

            // Weight
            if (!p.weight) {
                updates.weight = 250; // grams
            }

            // Brand
            if (!p.brand) {
                updates.brand = "Gachar Select";
            }

            // Is Physical
            if (p.isPhysical === undefined) {
                updates.isPhysical = true;
            }

            // Tags
            if (!p.tags || p.tags.length === 0) {
                updates.tags = ["Gachapon", "Toy", "Collectible"];
            }

            if (Object.keys(updates).length > 0) {
                await Product.updateOne({ _id: p._id }, { $set: updates });
                console.log(`Updated ${p.name}:`, updates);
            }
        }

        console.log('Backfill complete!');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

backfill();
