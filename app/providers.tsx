'use client';

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <LanguageProvider>
                <CartProvider>
                    <Toaster position="bottom-right" />
                    {children}
                </CartProvider>
            </LanguageProvider>
        </SessionProvider>
    );
}
