
import connectToDatabase from '../../lib/db';
import Product from '../../models/Product';
import Category from '../../models/Category';
import ProductList from '../../components/ProductList';

async function getProducts(categorySlug?: string) {
    await connectToDatabase();
    const query: any = { status: 'active' };

    if (categorySlug) {
        const category = await Category.findOne({ slug: categorySlug });
        if (category) {
            query.category = category._id;
        }
    }

    const products = await Product.find(query).populate('category').lean();
    return JSON.parse(JSON.stringify(products));
}

async function getCategories() {
    await connectToDatabase();
    const categories = await Category.find({}).lean();
    return JSON.parse(JSON.stringify(categories));
}

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const categorySlug = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;

    const [products, categories] = await Promise.all([
        getProducts(categorySlug),
        getCategories()
    ]);

    return <ProductList products={products} categories={categories} categorySlug={categorySlug} />;
}
