
import connectToDatabase from '../lib/db';
import Product from '../models/Product';
import LandingPage from '../components/LandingPage';

async function getFeaturedProducts() {
  await connectToDatabase();
  // Fetch 4 items, status active
  const products = await Product.find({ status: 'active' }).limit(4).lean();
  return JSON.parse(JSON.stringify(products)); // Serialization for Next.js
}

export default async function Home() {
  const products = await getFeaturedProducts();
  return <LandingPage products={products} />;
}
