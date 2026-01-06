
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

interface LandingPageProps {
    products: any[];
}

export default function LandingPage({ products }: LandingPageProps) {
    const { language } = useLanguage();
    const t = dictionary[language].hero;
    const tProd = dictionary[language].products;
    const tCat = dictionary[language].categories;

    return (
        <div className="flex flex-col gap-12 pb-12">
            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-40">
                    <Image
                        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000"
                        alt="Hero Background"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <div className="container relative z-10 px-4 text-center space-y-6">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-gachar-blue to-blue-300 bg-clip-text text-transparent">
                        {t.title}
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
                        {t.subtitle}
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/products"
                            className="px-8 py-3 bg-gachar-red hover:bg-red-600 text-white rounded-full font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg hover:shadow-red-500/20"
                        >
                            {t.cta} <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/categories"
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-full font-semibold transition-all"
                        >
                            {t.explore}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Products */}
            <section className="container mx-auto px-4">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">{t.featured}</h2>
                        <p className="text-gray-500 mt-2">{t.featured_sub}</p>
                    </div>
                    <Link href="/products" className="text-gachar-blue font-medium hover:underline">
                        {t.view_all}
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {products.map((product: any) => (
                        <Link
                            href={`/products/${product._id}`}
                            key={product._id}
                            className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                        >
                            <div className="relative h-64 w-full bg-gray-100">
                                {product.images?.[0] ? (
                                    <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-gachar-blue transition-colors line-clamp-1">
                                    {product.name}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1 mb-3 line-clamp-2">
                                    {product.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-lg text-gachar-red">฿{product.price.toLocaleString()}</span>
                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 capitalize">
                                        {product.status}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Categories Grid */}
            <section className="container mx-auto px-4 py-12 bg-gray-50 rounded-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">{t.browse_cat}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Link href="/categories/electronics" className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-shadow">
                        <Image
                            src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80"
                            alt="Electronics"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6">
                            <h3 className="text-3xl font-bold text-white tracking-wide">{tCat.electronics}</h3>
                        </div>
                    </Link>
                    <Link href="/categories/clothing" className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-shadow">
                        <Image
                            src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80"
                            alt="Clothing"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6">
                            <h3 className="text-3xl font-bold text-white tracking-wide">{tCat.clothing}</h3>
                        </div>
                    </Link>
                    <Link href="/categories/home-living" className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-shadow">
                        <Image
                            src="https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=800&q=80"
                            alt="Home & Living"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6">
                            <h3 className="text-3xl font-bold text-white tracking-wide">{tCat['home-living']}</h3>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}
