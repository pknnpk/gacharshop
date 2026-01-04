
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Filter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

interface ProductListProps {
    products: any[];
    categories: any[];
    categorySlug?: string;
}

export default function ProductList({ products, categories, categorySlug }: ProductListProps) {
    const { language } = useLanguage();
    const t = dictionary[language].products;
    const tCat = dictionary[language].categories;

    // Helper to get translated category name
    const getCategoryName = (slug: string) => {
        return tCat[slug as keyof typeof tCat] || slug;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 space-y-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter className="w-5 h-5 text-blue-600" />
                            <h2 className="font-bold text-gray-900">{t.filter_title}</h2>
                        </div>

                        <div>
                            <h3 className="font-semibold text-sm text-gray-900 mb-3">{dictionary[language].nav.categories}</h3>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        href="/products"
                                        className={`text-sm ${!categorySlug ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                                    >
                                        {t.title_all}
                                    </Link>
                                </li>
                                {categories.map((cat: any) => (
                                    <li key={cat._id}>
                                        <Link
                                            href={`/products?category=${cat.slug}`}
                                            className={`text-sm ${categorySlug === cat.slug ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                                        >
                                            {getCategoryName(cat.slug)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {categorySlug
                                ? getCategoryName(categorySlug)
                                : t.title_all}
                        </h1>
                        <p className="text-gray-500 mt-2">
                            {t.showing.replace('{count}', products.length.toString())}
                        </p>
                    </div>

                    {products.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
                            <p className="text-gray-500">{t.no_results}</p>
                            <Link href="/products" className="text-blue-600 hover:underline mt-2 inline-block">
                                {t.clear_filters}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product: any) => (
                                <Link
                                    href={`/products/${product._id}`}
                                    key={product._id}
                                    className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border"
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
                                        <p className="text-xs text-blue-600 font-medium mb-1 capitalize">
                                            {getCategoryName(product.category?.slug) || t.uncategorized}
                                        </p>
                                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <p className="text-gray-500 text-sm mt-1 mb-3 line-clamp-2">
                                            {product.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-lg text-gray-900">฿{product.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
