
import connectToDatabase from '../lib/db';
import Product from '../models/Product';
import LandingPage from '../components/LandingPage';

export const dynamic = 'force-dynamic';

async function getFeaturedProducts() {
  console.log("Page: getFeaturedProducts called. Connecting to DB...");
  const conn = await connectToDatabase();
  console.log("Page: DB Connected. ReadyState:", conn.readyState);

  if (conn.readyState !== 1) {
    console.error("Page: Connection not ready even after connectToDatabase!", conn.readyState);
  }

  // Fetch 4 items, status active
  console.log("Page: Querying products...");
  try {
    const products = await Product.find({ status: 'active' }).limit(4).lean();
    console.log("Page: Products queried successfully. Count:", products.length);
    return JSON.parse(JSON.stringify(products)); // Serialization for Next.js
  } catch (error) {
    console.error("Page: Error querying products:", error);
    throw error;
  }
}

export default async function Home() {
  const products = await getFeaturedProducts();
  return <LandingPage products={products} />;
}
