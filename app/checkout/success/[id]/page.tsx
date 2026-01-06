
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SuccessPage({ params }: PageProps) {
    const { id } = await params;

    return (
        <div className="container mx-auto px-4 py-20 text-center">
            <div className="flex justify-center mb-6">
                <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gray-900">Order Confirmed!</h1>
            <p className="text-xl text-gray-600 mb-8">
                Thank you for your purchase. Your order has been placed successfully.
            </p>

            <div className="bg-gray-50 max-w-md mx-auto p-6 rounded-2xl border mb-8">
                <span className="text-gray-500 text-sm block mb-1">Order ID</span>
                <span className="font-mono font-medium text-lg select-all">{id}</span>
            </div>

            <div className="flex justify-center gap-4">
                <Link
                    href="/products"
                    className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition-colors font-semibold"
                >
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
}
