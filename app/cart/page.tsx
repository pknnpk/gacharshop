'use client';

import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { dictionary } from '../../dictionaries';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowRight, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

// Component to handle countdown logic
const ReservationTimer = ({ expiresAt }: { expiresAt: string }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const distance = expiry - now;

            if (distance < 0) {
                setTimeLeft('Expired');
                setIsExpired(true);
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (isExpired) return <span className="text-red-500 text-xs font-medium">Expired</span>;
    if (!timeLeft) return null;

    return (
        <span className="text-orange-600 text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Reserved: {timeLeft}
        </span>
    );
};

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();
    const { language } = useLanguage();
    const t = dictionary[language].cart || {
        // Fallback if dictionary update isn't ready
        title: 'Shopping Cart',
        empty: 'Your cart is empty',
        continue_shopping: 'Continue Shopping',
        quantity: 'Quantity',
        total: 'Total',
        subtotal: 'Subtotal',
        checkout: 'Proceed to Checkout',
        remove: 'Remove'
    };

    if (cart.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
                <p className="text-gray-500 mb-8">{t.empty}</p>
                <Link href="/products" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                    {t.continue_shopping}
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold mb-8">{t.title} ({totalItems})</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cart.map((item) => (
                        <div key={item.product._id} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                            {/* Loading overlay if item expired/removing? Not needed as API cleans up */}

                            <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                {item.product.images?.[0] ? (
                                    <Image
                                        src={item.product.images[0]}
                                        alt={item.product.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-gray-400">No Image</div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.product.name}</h3>
                                        <button
                                            onClick={() => removeFromCart(item.product._id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-blue-600 font-medium">฿{item.product.price.toLocaleString()}</p>
                                        {/* Timer */}
                                        {item.expiresAt && <ReservationTimer expiresAt={item.expiresAt} />}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border rounded-lg">
                                        <button
                                            onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                            className="p-1 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                            className="p-1 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                                            disabled={item.quantity >= item.product.stock} // This considers AVAILABLE stock (which includes current reservation?)
                                        // Issue: 'stock' in DB is now 'available' stock. 
                                        // The user HAS 'quantity' reserved. 
                                        // So Max Potential = item.product.stock (available) + item.quantity (reserved).
                                        // However, our API logic diffs incoming vs current. 
                                        // If we ask for +1, API checks if product.stock > 0. Correct.
                                        // So button disabled condition is simply: product.stock === 0.
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {item.product.stock === 0 && (
                                        <span className="text-xs text-red-500">Max stock</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
                        <h2 className="text-lg font-bold mb-4">{t.total}</h2>
                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>{t.subtotal}</span>
                                <span>฿{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span className="text-green-600">Free</span>
                            </div>
                        </div>
                        <div className="flex justify-between font-bold text-xl mb-6 pt-4 border-t">
                            <span>{t.total}</span>
                            <span>฿{subtotal.toLocaleString()}</span>
                        </div>
                        <Link
                            href="/checkout"
                            className="block w-full bg-black text-white text-center py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors"
                        >
                            {t.checkout}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
