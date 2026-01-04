
'use client';

import Image from 'next/image';
import { ShoppingCart, Check, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

interface ProductDetailProps {
    product: any;
}

export default function ProductDetail({ product }: ProductDetailProps) {
    const { language } = useLanguage();
    const t = dictionary[language].product;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Product Images */}
                <div className="space-y-4">
                    <div className="relative aspect-square w-full bg-gray-100 rounded-2xl overflow-hidden border">
                        {product.images?.[0] ? (
                            <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                        )}
                    </div>
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full capitalize">
                                {product.category?.name || 'General'}
                            </span>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {product.stock > 0 ? t.in_stock : t.out_of_stock}
                            </span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900">{product.name}</h1>
                        <div className="flex items-center gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-gray-500 text-sm ml-2">{t.reviews.replace('{count}', '24')}</span>
                        </div>
                    </div>

                    <div className="text-3xl font-bold text-gray-900">
                        ฿{product.price.toLocaleString()}
                    </div>

                    <div className="prose prose-gray max-w-none text-gray-600">
                        <p>{product.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t space-y-4">
                        <div className="flex items-center gap-4">
                            <button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                disabled={product.stock === 0}
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {product.stock > 0 ? t.add_to_cart : t.out_of_stock}
                            </button>
                            <button className="px-4 py-4 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Check className="w-4 h-4 text-green-500" />
                                {t.free_shipping}
                            </div>
                            <div className="flex items-center gap-1">
                                <Check className="w-4 h-4 text-green-500" />
                                {t.returns}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
