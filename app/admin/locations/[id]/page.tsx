'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MapPin,
    ArrowLeft,
    Package,
    Plus,
    Minus,
    History,
    Search,
    X
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LocationDetail() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const router = useRouter();
    const [location, setLocation] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLoading, setAuditLoading] = useState(false);

    // Adjustment Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
    const [adjustQty, setAdjustQty] = useState(1);
    const [adjustReason, setAdjustReason] = useState('');

    // Add Product Modal (Search)
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLocation = async () => {
        try {
            const res = await fetch(`/api/admin/locations?id=${id}`);
            if (!res.ok) throw new Error('Location not found');
            const data = await res.json();
            setLocation(data);
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลสถานที่ได้');
            router.push('/admin/locations');
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await fetch(`/api/admin/inventory?locationId=${id}`);
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error(error);
        }
    };

    const searchAllProducts = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) return;

        const res = await fetch('/api/admin/inventory');
        const all = await res.json();
        const filtered = all.filter((p: any) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.sku?.toLowerCase().includes(q.toLowerCase())
        );
        setSearchResults(filtered);
    };

    useEffect(() => {
        if (id) {
            setLoading(true);
            Promise.all([fetchLocation(), fetchInventory()]).then(() => setLoading(false));
        }
    }, [id]);

    const handleAdjustment = async () => {
        if (!selectedProduct) return;
        setAuditLoading(true);

        try {
            const res = await fetch('/api/admin/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct._id,
                    locationId: location._id,
                    type: adjustType,
                    quantity: Number(adjustQty),
                    reason: adjustReason
                })
            });

            if (!res.ok) throw new Error('Adjustment failed');

            toast.success('อัปเดตสต็อกเรียบร้อย');
            setShowModal(false);
            setAdjustQty(1);
            setAdjustReason('');
            fetchInventory();
        } catch (error) {
            toast.error('อัปเดตสต็อกไม่สำเร็จ');
        } finally {
            setAuditLoading(false);
        }
    };

    const openAdjustModal = (product: any) => {
        setSelectedProduct(product);
        setAdjustType('add');
        setAdjustQty(1);
        setShowModal(true);
    };

    if (loading) return <div className="p-8 text-center animate-pulse">กำลังโหลด...</div>;
    if (!location) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/locations" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="text-gachar-blue" />
                        {location.name}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {location.type.toUpperCase()}
                        {location.parent && <span className="text-gray-400 mx-2">• ภายใน: {location.parent.name}</span>}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> เพิ่มสินค้า
                    </button>
                    <button className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600" title="ประวัติ">
                        <History className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">สินค้า</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">คงเหลือ (ที่นี่)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">รวมทั้งหมด</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.filter(p => (p.locationStock || 0) > 0).map(product => (
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
                                            <p className="font-medium text-gray-900">{product.name}</p>
                                            <p className="text-xs text-gray-400">{product.sku}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono font-bold text-lg text-gachar-blue">
                                        {product.locationStock}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {product.totalStock}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => openAdjustModal(product)}
                                        className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded font-medium"
                                    >
                                        ปรับยอด
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {products.filter(p => (p.locationStock || 0) > 0).length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                    ไม่พบสินค้าในตำแหน่งนี้
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Adjust Modal */}
            {showModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-lg mb-1">ปรับปรุงสต็อก</h3>
                        <p className="text-sm text-gray-500 mb-4">{selectedProduct.name} @ {location.name}</p>

                        <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-lg">
                            <button onClick={() => setAdjustType('add')} className={`flex-1 py-1 text-sm font-medium rounded ${adjustType === 'add' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>เพิ่ม</button>
                            <button onClick={() => setAdjustType('subtract')} className={`flex-1 py-1 text-sm font-medium rounded ${adjustType === 'subtract' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>ลด</button>
                            <button onClick={() => setAdjustType('set')} className={`flex-1 py-1 text-sm font-medium rounded ${adjustType === 'set' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>ตั้งค่า</button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">จำนวน</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full border rounded-lg px-3 py-2 text-lg font-bold text-center"
                                value={adjustQty}
                                onChange={e => setAdjustQty(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-500 mb-1">เหตุผล (ถ้ามี)</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                placeholder="เช่น สินค้าชำรุด, ตรวจนับ, พบเจอ"
                                value={adjustReason}
                                onChange={e => setAdjustReason(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-50 rounded-lg">ยกเลิก</button>
                            <button
                                onClick={handleAdjustment}
                                disabled={auditLoading}
                                className="flex-1 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50"
                            >
                                {auditLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search/Add Modal */}
            {showSearchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex items-center gap-2">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="ค้นหาสินค้า..."
                                className="flex-1 outline-none"
                                value={searchQuery}
                                onChange={e => searchAllProducts(e.target.value)}
                            />
                            <button onClick={() => setShowSearchModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="overflow-y-auto p-2">
                            {searchResults.length === 0 && searchQuery.length > 2 && (
                                <p className="text-center text-gray-500 py-8">ไม่พบสินค้าที่ค้นหา</p>
                            )}
                            {searchResults.map(p => (
                                <div
                                    key={p._id}
                                    onClick={() => {
                                        setShowSearchModal(false);
                                        openAdjustModal(p);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-50 last:border-0"
                                >
                                    {p.images?.[0] ? (
                                        <img src={p.images[0]} className="w-10 h-10 rounded object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400"><Package className="w-4 h-4" /></div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-500">{p.sku}</p>
                                    </div>
                                    <div className="ml-auto text-sm text-gray-400">
                                        รวม: {p.totalStock}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
