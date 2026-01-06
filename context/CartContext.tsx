'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export interface CartItem {
    product: {
        _id: string;
        name: string;
        price: number;
        images: string[];
        stock: number;
        [key: string]: any
    };
    quantity: number;
    expiresAt?: string; // New field
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, quantity?: number) => Promise<void>;
    removeFromCart: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalItems: number;
    subtotal: number;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial load - Only for authenticated users
    useEffect(() => {
        const loadCart = async () => {
            setIsLoading(true);
            if (status === 'authenticated') {
                try {
                    const res = await fetch('/api/cart');
                    const data = await res.json();

                    if (res.ok) {
                        setCart(data.items || []);

                        // Check for expired items notice
                        if (data.removedCount && data.removedCount > 0) {
                            toast(`${data.removedCount} item(s) removed due to reservation timeout`, {
                                icon: '🕒',
                                duration: 5000
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to load cart from API:', error);
                }
            } else {
                setCart([]); // Clear cart if not authenticated
            }
            setIsLoading(false);
        };

        loadCart();
    }, [status]);

    const addToCart = async (product: any, quantity = 1) => {
        if (status !== 'authenticated') {
            toast.error('Please login to reserve items');
            router.push('/login?callbackUrl=' + window.location.pathname);
            return;
        }

        // Optimistic UI update not possible due to complex server-side checks (Quota/Stock)
        // We must wait for server response
        const toastId = toast.loading('Reserving stock...');

        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ product: product._id, quantity }] // Send just the delta or full state? 
                    // Our API was designed to take full state, but for reservation we should probably change to delta 
                    // OR we just send the current cart + new item.
                    // To be safe and reuse existing structure, let's construct the "desired" state.
                }),
            });

            // Wait, our API currently takes "items" and "upserts" the whole cart.
            // But we need to check quota/stock delta.
            // Let's modify the API to accept "action" based requests or be smarter.
            // For now, let's send the "Target State" and let the API validate the Delta.

            // Actually, for immediate reservation, it's safer if the API handles the logic of "Add 1".
            // But sticking to the "Whole Cart Sync" model we built in Phase 3 is tricky with immediate reservation.
            // Let's refactor the API call to send the *change* we want, or rely on the API to diff it.

            // Let's try sending the *intended* new cart state, and if API rejects it (Quota/Stock), we revert.
            const existingItemIndex = cart.findIndex((item) => item.product._id === product._id);
            let newCart = [...cart];
            if (existingItemIndex > -1) {
                newCart[existingItemIndex].quantity += quantity;
            } else {
                newCart.push({ product, quantity }); // We need full product object for UI? API only needs ID.
            }

            // Call API with new state
            const syncRes = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: newCart.map(item => ({
                        product: item.product._id,
                        quantity: item.quantity
                    }))
                }),
            });

            const data = await syncRes.json();

            if (!syncRes.ok) {
                throw new Error(data.error || 'Failed to add to cart');
            }

            setCart(data.items); // Update with server state (including new expiresAt)
            toast.success('Item reserved!', { id: toastId });

        } catch (error: any) {
            toast.error(error.message, { id: toastId });
            // Revert or re-fetch? Re-fetch is safer.
            const res = await fetch('/api/cart');
            if (res.ok) {
                const data = await res.json();
                setCart(data.items || []);
            }
        }
    };

    const removeFromCart = async (productId: string) => {
        if (status !== 'authenticated') return;

        const newCart = cart.filter((item) => item.product._id !== productId);
        setCart(newCart); // Optimistic Remove

        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: newCart.map(item => ({ product: item.product._id, quantity: item.quantity }))
                }),
            });
        } catch (error) {
            console.error('Failed to sync remove:', error);
        }
    };

    const updateQuantity = async (productId: string, quantity: number) => {
        if (status !== 'authenticated') return;
        if (quantity < 1) return;

        // Optimistic
        const oldCart = [...cart];
        const newCart = cart.map((item) => {
            if (item.product._id === productId) {
                return { ...item, quantity };
            }
            return item;
        });
        setCart(newCart);

        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: newCart.map(item => ({ product: item.product._id, quantity: item.quantity }))
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message);
            setCart(oldCart); // Revert
        }
    };

    const clearCart = async () => {
        setCart([]);
        if (status === 'authenticated') {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [] }),
            });
        }
    };

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalItems,
            subtotal,
            isLoading
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
