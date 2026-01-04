
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import Category from '../models/Category';
import Product from '../models/Product';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env');
    process.exit(1);
}

const categoriesData = [
    {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Gadgets, devices, and accessories.',
        image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Men and Women fashion.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Home & Living',
        slug: 'home-living',
        description: 'Furniture, decor, and essentials.',
        image: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=800&q=80',
    },
];

const productsData = [
    {
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'High-quality noise-canceling wireless headphones.',
        price: 3490,
        images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'],
        categorySlug: 'electronics',
        stock: 50,
        status: 'active',
    },
    {
        name: 'Smart Watch',
        slug: 'smart-watch',
        description: 'Fitness tracker and smart notifications.',
        price: 5290,
        images: ['https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=800&q=80'],
        categorySlug: 'electronics',
        stock: 30,
        status: 'active',
    },
    {
        name: 'Cotton T-Shirt',
        slug: 'cotton-t-shirt',
        description: '100% organic cotton basic tee.',
        price: 699,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'],
        categorySlug: 'clothing',
        stock: 100,
        status: 'active',
    },
    {
        name: 'Denim Jacket',
        slug: 'denim-jacket',
        description: 'Classic vintage style denim jacket.',
        price: 2490,
        images: ['https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80'],
        categorySlug: 'clothing',
        stock: 25,
        status: 'active',
    },
    {
        name: 'Modern Lamp',
        slug: 'modern-lamp',
        description: 'Minimalist desk lamp for your workspace.',
        price: 1290,
        images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=800&q=80'],
        categorySlug: 'home-living',
        stock: 40,
        status: 'active',
    },
];

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('Cleared existing Categories and Products');

        // Insert Categories
        const createdCategories = await Category.insertMany(categoriesData);
        console.log(`Seeded ${createdCategories.length} Categories`);

        // Map category slugs to IDs
        const categoryMap = new Map();
        createdCategories.forEach((cat) => {
            categoryMap.set(cat.slug, cat._id);
        });

        // Prepare Products with Category IDs
        const productsWithCategoryIds = productsData.map((prod) => {
            const { categorySlug, ...rest } = prod;
            const categoryId = categoryMap.get(categorySlug);
            if (!categoryId) {
                throw new Error(`Category not found for slug: ${categorySlug}`);
            }
            return {
                ...rest,
                category: categoryId,
            };
        });

        // Insert Products
        const createdProducts = await Product.insertMany(productsWithCategoryIds);
        console.log(`Seeded ${createdProducts.length} Products`);

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seed();
