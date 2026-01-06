'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, Search, User, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';
import { useCart } from '../context/CartContext';
import { useSession } from 'next-auth/react';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { language, toggleLanguage } = useLanguage();
    const { totalItems } = useCart();
    const { data: session } = useSession();
    const pathname = usePathname();
    const t = dictionary[language].nav;

    // Hide Header on specific mobile tabs where they have their own headers
    const hideHeaderOnMobile = ['/notifications', '/profile'];
    // We use a check to see if we are on these pages
    const isHeaderHiddenMobile = hideHeaderOnMobile.some(path => pathname.startsWith(path));

    return (
        <header className={`sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md ${isHeaderHiddenMobile ? 'hidden md:block' : ''}`}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Logo - Desktop Only */}
                <Link href="/" className="hidden md:flex items-center gap-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-gachar-blue to-blue-600 bg-clip-text text-transparent">
                        GacharShop
                    </span>
                </Link>

                {/* Mobile Search Bar (Full Width Layout) */}
                <div className="flex-1 md:hidden relative flex items-center gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={language === 'th' ? 'ค้นหา...' : 'Search...'}
                            className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-gachar-blue text-sm text-gray-800"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>

                    {/* Cart Icon (Mobile) */}
                    <Link href="/cart" className="relative p-2" aria-label="Cart">
                        <ShoppingCart className="w-6 h-6 text-gray-700" />
                        {totalItems > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] items-center justify-center flex bg-gachar-red text-white rounded-full">
                                {totalItems}
                            </span>
                        )}
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-medium hover:text-gachar-blue transition-colors">
                        {t.home}
                    </Link>
                    <Link href="/products" className="text-sm font-medium hover:text-gachar-blue transition-colors">
                        {t.shop}
                    </Link>
                    <Link href="/categories" className="text-sm font-medium hover:text-gachar-blue transition-colors">
                        {t.categories}
                    </Link>
                    <Link href="/about" className="text-sm font-medium hover:text-gachar-blue transition-colors">
                        {t.about}
                    </Link>
                </nav>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4 flex-none justify-end">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-full transition-colors text-sm font-medium text-gray-700"
                        aria-label="Toggle Language"
                    >
                        <Globe className="w-4 h-4" />
                        <span>{language.toUpperCase()}</span>
                    </button>

                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Search">
                        <Search className="w-5 h-5 text-gray-600" />
                    </button>

                    <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Cart">
                        <ShoppingCart className="w-5 h-5 text-gray-600" />
                        {totalItems > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 text-[10px] items-center justify-center flex bg-gachar-red text-white rounded-full">
                                {totalItems}
                            </span>
                        )}
                    </Link>

                    {/* User Icon */}
                    {session ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Hi, {session.user?.name?.split(' ')[0]}</span>
                            {session.user?.image ? (
                                <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full" />
                            ) : (
                                <User className="w-5 h-5 text-gray-600" />
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Account">
                            <User className="w-5 h-5 text-gray-600" />
                        </Link>
                    )}
                </div>
            </div >
        </header >
    );
};

export default Header;
