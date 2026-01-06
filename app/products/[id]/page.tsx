
import { notFound } from 'next/navigation';
import connectToDatabase from '../../../lib/db';
import Product from '../../../models/Product';
import '../../../models/Category'; // Register Category model
import ProductDetail from '../../../components/ProductDetail';

async function getProduct(id: string) {
    await connectToDatabase();
    const product = await Product.findById(id).populate('category').lean();
    if (!product) return null;
    return JSON.parse(JSON.stringify(product));
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
        notFound();
    }

    return <ProductDetail product={product} />;
}
