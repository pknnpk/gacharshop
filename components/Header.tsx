'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, Search, User, Globe } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { language, toggleLanguage } = useLanguage();
    const t = dictionary[language].nav;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        GacharShop
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-medium hover:text-blue-600 transition-colors">
                        {t.home}
                    </Link>
                    <Link href="/products" className="text-sm font-medium hover:text-blue-600 transition-colors">
                        {t.shop}
                    </Link>
                    <Link href="/categories" className="text-sm font-medium hover:text-blue-600 transition-colors">
                        {t.categories}
                    </Link>
                    <Link href="/about" className="text-sm font-medium hover:text-blue-600 transition-colors">
                        {t.about}
                    </Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-full transition-colors text-sm font-medium text-gray-700"
                        aria-label="Toggle Language"
                    >
                        <Globe className="w-4 h-4" />
                        {language.toUpperCase()}
                    </button>

                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Search">
                        <Search className="w-5 h-5 text-gray-600" />
                    </button>
                    <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Cart">
                        <ShoppingCart className="w-5 h-5 text-gray-600" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </Link>
                    <Link href="/login" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Account">
                        <User className="w-5 h-5 text-gray-600" />
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Menu"
                    >
                        <Menu className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-white">
                    <nav className="flex flex-col p-4 gap-4">
                        <Link
                            href="/"
                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {t.home}
                        </Link>
                        <Link
                            href="/products"
                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {t.shop}
                        </Link>
                        <Link
                            href="/categories"
                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {t.categories}
                        </Link>
                        <Link
                            href="/about"
                            className="text-sm font-medium hover:text-blue-600 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {t.about}
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
