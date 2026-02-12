
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Save,
    Trash2,
    Package,
    Tag,
    DollarSign,
    Box,
    Image as ImageIcon,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductEditor() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [product, setProduct] = useState<any>({
        name: '',
        slug: '',
        description: '',
        price: 0,
        costPrice: 0,
        sku: '',
        barcode: '',
        stock: 0,
        category: '',
        status: 'draft',
        images: [],
        weight: 0,
        dimensions: { length: 0, width: 0, height: 0 },
        tags: [],
        brand: '',
        isPhysical: true
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        // Fetch Categories
        fetch('/api/categories').then(res => res.json()).then(data => setCategories(data)).catch(console.error);

        if (!isNew && id) {
            fetch(`/api/admin/products/${id}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load product');
                    return res.json();
                })
                .then(data => {
                    setProduct({
                        ...data,
                        // Ensure nested objects exist
                        dimensions: data.dimensions || { length: 0, width: 0, height: 0 },
                        tags: data.tags || [],
                        images: data.images || []
                    });
                    setLoading(false);
                })
                .catch(err => {
                    toast.error(err.message);
                    router.push('/admin/products');
                });
        }
    }, [id, isNew, router]);

    const handleChange = (field: string, value: any) => {
        setProduct((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleDimensionChange = (dim: string, value: number) => {
        setProduct((prev: any) => ({
            ...prev,
            dimensions: { ...prev.dimensions, [dim]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = isNew ? '/api/admin/products' : `/api/admin/products/${id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to save');

            toast.success('บันทึกเรียบร้อย');
            if (isNew) {
                router.replace(`/admin/products/${data.product._id}`);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('ยืนยันการลบสินค้า? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }
            toast.success('ลบสินค้าเรียบร้อย');
            router.push('/admin/products');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gachar-blue" /></div>;

    const tabs = [
        { id: 'general', label: 'ทั่วไป', icon: Package },
        { id: 'pricing', label: 'ราคา', icon: DollarSign },
        { id: 'inventory', label: 'สต็อก', icon: Box },
        { id: 'shipping', label: 'จัดส่ง', icon: Tag }, // Using Tag for now
        { id: 'media', label: 'รูปภาพ', icon: ImageIcon },
    ];

    return (
        <form onSubmit={handleSubmit} className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {isNew ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า'}
                        </h1>
                        <p className="text-sm text-gray-500">{isNew ? 'สร้างรายการสินค้าใหม่' : `ID: ${id}`}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> ลบ
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        บันทึก
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-l-4 transition-colors ${activeTab === tab.id
                                    ? 'border-gachar-blue bg-blue-50 text-gachar-blue font-medium'
                                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in">
                            <h2 className="text-lg font-bold mb-4">ข้อมูลทั่วไป</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={product.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่ <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={product.category}
                                        onChange={e => handleChange('category', e.target.value)}
                                    >
                                        <option value="">เลือกหมวดหมู่...</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={product.status}
                                        onChange={e => handleChange('status', e.target.value)}
                                    >
                                        <option value="draft">Draft (แบบร่าง)</option>
                                        <option value="active">Active (พร้อมขาย)</option>
                                        <option value="archived">Archived (ระงับ)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                                <textarea
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={product.description}
                                    onChange={e => handleChange('description', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">แบรนด์</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={product.brand}
                                    onChange={e => handleChange('brand', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Pricing Tab */}
                    {activeTab === 'pricing' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in">
                            <h2 className="text-lg font-bold mb-4">ราคาและต้นทุน</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขาย (Price) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                            value={product.price}
                                            onChange={e => handleChange('price', Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน (Cost Price)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">฿</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                            value={product.costPrice}
                                            onChange={e => handleChange('costPrice', Number(e.target.value))}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">ใช้สำหรับคำนวณกำไร (ไม่แสดงให้ลูกค้าเห็น)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in">
                            <h2 className="text-lg font-bold mb-4">ข้อมูลคลังสินค้า</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU (รหัสสินค้า) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-mono uppercase"
                                        value={product.sku}
                                        onChange={e => handleChange('sku', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (บาร์โค้ด)</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-mono"
                                        value={product.barcode}
                                        onChange={e => handleChange('barcode', e.target.value)}
                                    />
                                </div>
                            </div>

                            {!isNew && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">สต็อกปัจจุบัน</p>
                                            <p className="text-sm text-gray-500">Global Stock</p>
                                        </div>
                                        <div className="text-3xl font-bold font-mono text-gachar-blue">
                                            {product.stock}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Link href={`/admin/inventory?search=${product.sku}`} className="text-sm text-blue-600 hover:underline">
                                            จัดการสต็อกรายสถานที่ &rarr;
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Shipping Tab */}
                    {activeTab === 'shipping' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in">
                            <h2 className="text-lg font-bold mb-4">การจัดส่ง (Shipping)</h2>

                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="isPhysical"
                                    checked={product.isPhysical}
                                    onChange={e => handleChange('isPhysical', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="isPhysical" className="text-gray-700">เป็นสินค้าที่มีตัวตน (Physical Product)</label>
                            </div>

                            {product.isPhysical && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (Weight)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                value={product.weight}
                                                onChange={e => handleChange('weight', Number(e.target.value))}
                                            />
                                            <span className="text-gray-500">กรัม (g)</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ขนาด (Dimensions)</label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">ยาว (L)</label>
                                                <input
                                                    type="number" min="0" placeholder="cm"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                    value={product.dimensions.length}
                                                    onChange={e => handleDimensionChange('length', Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">กว้าง (W)</label>
                                                <input
                                                    type="number" min="0" placeholder="cm"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                    value={product.dimensions.width}
                                                    onChange={e => handleDimensionChange('width', Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">สูง (H)</label>
                                                <input
                                                    type="number" min="0" placeholder="cm"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                    value={product.dimensions.height}
                                                    onChange={e => handleDimensionChange('height', Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Media Tab */}
                    {activeTab === 'media' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in">
                            <h2 className="text-lg font-bold mb-4">รูปภาพสินค้า</h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 text-gray-500">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>Image upload functionality coming soon.</p>
                                <p className="text-xs mt-1">For now, images are handled via external URLs or separate media manager.</p>
                            </div>

                            {/* Temporary URL input for images */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Temporary)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="https://example.com/image.jpg"
                                    onBlur={(e) => {
                                        if (e.target.value && !product.images.includes(e.target.value)) {
                                            handleChange('images', [...product.images, e.target.value]);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-400 mt-1">Paste URL and click outside to add.</p>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mt-4">
                                {product.images.map((img: string, idx: number) => (
                                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleChange('images', product.images.filter((_: string, i: number) => i !== idx))}
                                            className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}
