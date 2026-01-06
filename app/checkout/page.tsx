'use client';

import { useCart } from '../../context/CartContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
    const { cart, subtotal, clearCart } = useCart();
    const { data: session, status } = useSession();
    const router = useRouter();
    const [address, setAddress] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/checkout');
        }
    }, [status, router]);

    if (status === 'loading' || cart.length === 0) {
        if (status !== 'loading' && cart.length === 0) {
            // Redirect if empty but give a moment to see why
            setTimeout(() => router.push('/cart'), 100);
        }
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Checkout failed');
            }

            // Success
            await clearCart();
            router.push(`/checkout/success/${data.orderId}`);

        } catch (error: any) {
            toast.error(error.message);
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Shipping Form */}
                <div>
                    <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
                    <form onSubmit={handleCheckout} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={session?.user?.name || ''}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={session?.user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border bg-gray-50 text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Shipping Address <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                rows={4}
                                placeholder="Enter your full address here..."
                                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-black text-white py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isProcessing ? 'Processing Order...' : `Pay ฿${subtotal.toLocaleString()}`}
                        </button>
                    </form>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 p-8 rounded-2xl h-fit">
                    <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
                    <div className="space-y-4 mb-6">
                        {cart.map((item) => (
                            <div key={item.product._id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">
                                    {item.quantity}x {item.product.name}
                                </span>
                                <span className="font-medium">฿{(item.product.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-4 flex justify-between items-center text-xl font-bold">
                        <span>Total</span>
                        <span>฿{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="mt-6 text-xs text-gray-400 text-center">
                        Secure checkout. Order will be placed with "Pending" status.
                    </div>
                </div>
            </div>
        </div>
    );
}
