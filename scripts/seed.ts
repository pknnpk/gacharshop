
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load env vars
// fallback to .env
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: '.env' });
}

import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable');
    process.exit(1);
}

const mockProducts = [
    {
        name: "Vintage Gacha Pod",
        description: "A rare authentic vintage gacha pod from 1990s.",
        price: 150,
        stock: 50,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Neon Anime Figure",
        description: "Limited edition neon colored figure.",
        price: 850,
        stock: 5,
        reservationDuration: 15, // Hot item
        images: ["https://placehold.co/400"]
    },
    {
        name: "Mystery Box - Gold",
        description: "Contains 5 random premium items.",
        price: 1200,
        stock: 20,
        reservationDuration: 30,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Miniature Arcade Machine",
        description: "Fully functional 1/12 scale arcade.",
        price: 2500,
        stock: 3,
        reservationDuration: 15,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Capsule Toy Set A",
        description: "Set of 10 standard capsules.",
        price: 300,
        stock: 100,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Retro Keychain",
        description: "Pixel art style keychain.",
        price: 80,
        stock: 200,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Collector's Coin",
        description: "Commemorative coin 2025.",
        price: 500,
        stock: 10,
        reservationDuration: 45,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Plushie Mascot",
        description: "Soft and cuddly mascot character.",
        price: 450,
        stock: 30,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Sticker Pack",
        description: "Holographic stickers.",
        price: 50,
        stock: 500,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    },
    {
        name: "Display Case",
        description: "Acrylic case for your collection.",
        price: 900,
        stock: 15,
        reservationDuration: 60,
        images: ["https://placehold.co/400"]
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to MongoDB');

        // 1. Ensure Category
        let category = await Category.findOne({ name: 'General' });
        if (!category) {
            category = await Category.create({
                name: 'General',
                slug: 'general',
                description: 'General Items'
            });
            console.log('Created Category: General');
        }

        // 2. Insert Products
        const operations = mockProducts.map((p, index) => ({
            updateOne: {
                filter: { slug: `mock-product-${index}` }, // Use robust slug
                update: {
                    $set: {
                        name: p.name,
                        slug: `mock-product-${index}`,
                        description: p.description,
                        price: p.price,
                        category: category!._id,
                        stock: p.stock,
                        reservationDuration: p.reservationDuration,
                        images: p.images,
                        status: 'active'
                    }
                },
                upsert: true
            }
        }));

        await Product.bulkWrite(operations);
        console.log(`Seeded ${mockProducts.length} products.`);

    } catch (error) {
        console.error('Seed Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

seed();
