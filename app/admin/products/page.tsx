
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Edit,
    Trash2,
    Package,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductList() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search
            });
            const res = await fetch(`/api/admin/products?${params}`);
            const data = await res.json();
            setProducts(data.products);
            setPagination(data.pagination);
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="text-gachar-blue" />
                        สินค้าทั้งหมด (Products)
                    </h1>
                    <p className="text-sm text-gray-500">จัดการรายการสินค้า ราคา และสต็อก</p>
                </div>
                <Link
                    href="/admin/products/new"
                    className="flex items-center gap-2 px-4 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ, SKU, หรือ Barcode..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {/* Future: Category Filter, Status Filter */}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600">สินค้า</th>
                            <th className="px-6 py-4 font-semibold text-gray-600">หมวดหมู่</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-right">ราคา</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-center">สถานะ</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-center">สต็อกรวม</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && products.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                </td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-400">
                                    ไม่พบสินค้า
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                                                <div className="flex gap-2 text-xs text-gray-500">
                                                    <span>SKU: {product.sku || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {product.category?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        ฿{product.price.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-700' :
                                                product.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {product.status === 'active' ? 'พร้อมขาย' :
                                                product.status === 'draft' ? 'แบบร่าง' : 'ระงับ'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-mono font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/admin/products/${product._id}`}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg hover:text-blue-600 transition"
                                                title="แก้ไข"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                        หน้า {page} จาก {pagination.pages}
                    </span>
                    <button
                        disabled={page === pagination.pages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
