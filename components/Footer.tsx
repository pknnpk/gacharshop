
'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

const Footer = () => {
    const { language } = useLanguage();
    const t = dictionary[language].footer;
    const cat = dictionary[language].categories;

    return (
        <footer className="bg-gray-50 border-t">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            GacharShop
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Your one-stop shop for premium gadgets, fashion, and lifestyle essentials.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Links - Shop */}
                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">{t.shop}</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/products" className="hover:text-blue-600">{dictionary[language].products.title_all}</Link></li>
                            <li><Link href="/categories/electronics" className="hover:text-blue-600">{cat.electronics}</Link></li>
                            <li><Link href="/categories/clothing" className="hover:text-blue-600">{cat.clothing}</Link></li>
                            <li><Link href="/categories/home-living" className="hover:text-blue-600">{cat['home-living']}</Link></li>
                        </ul>
                    </div>

                    {/* Links - Company */}
                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">{t.company}</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/about" className="hover:text-blue-600">{dictionary[language].nav.about}</Link></li>
                            <li><Link href="/contact" className="hover:text-blue-600">Contact</Link></li>
                            <li><Link href="/careers" className="hover:text-blue-600">Careers</Link></li>
                            <li><Link href="/blog" className="hover:text-blue-600">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="font-semibold mb-4 text-gray-900">{t.stay_updated}</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            {t.subscribe_text}
                        </p>
                        <form className="flex gap-2">
                            <input
                                type="email"
                                placeholder={t.email_placeholder}
                                className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                onClick={(e) => e.preventDefault()}
                            >
                                {t.join}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} GacharShop. {t.rights}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
