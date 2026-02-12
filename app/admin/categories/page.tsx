'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Folder, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    parent?: {
        _id: string;
        name: string;
    } | null;
    level: number;
    ancestors: any[];
    createdAt: string;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parent: ''
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories');
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch categories');
            }

            setCategories(data);
        } catch (error: any) {
            console.error('Fetch error:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingCategory
                ? `/api/admin/categories/${editingCategory._id}`
                : '/api/admin/categories';

            const method = editingCategory ? 'PUT' : 'POST';

            const payload: any = { ...formData };
            if (payload.parent === '') payload.parent = null; // Send null for root

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save');
            }

            toast.success(editingCategory ? 'Category updated' : 'Category created');
            setIsModalOpen(false);
            setEditingCategory(null);
            setFormData({ name: '', description: '', parent: '' });
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/admin/categories/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete');
            }

            toast.success('Category deleted');
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const openEdit = (cat: Category) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            description: cat.description || '',
            parent: cat.parent?._id || ''
        });
        setIsModalOpen(true);
    };

    // Render Tree Helper
    // For the table, a flat list sorted by hierarchy might be easier for Phase 1.
    // We already fetch them sorted by level, but strict tree sort is better.
    // Let's just render the flat list with indentation for now.

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-outfit text-gray-800">หมวดหมู่สินค้า</h1>
                    <p className="text-gray-500">จัดการโครงสร้างหมวดหมู่สินค้า (Categories)</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData({ name: '', description: '', parent: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่มหมวดหมู่
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">ชื่อหมวดหมู่</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Slug</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">สินค้า (Products)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {categories.map((cat) => (
                            <tr key={cat._id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${cat.level * 20}px` }}>
                                        {cat.level > 0 && <span className="text-gray-300">└─</span>}
                                        <Folder className="w-4 h-4 text-blue-500" />
                                        <span className={cat.level === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                                            {cat.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{cat.slug}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">-</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => openEdit(cat)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat._id)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    ยังไม่มีหมวดหมู่
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหมวดหมู่</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่หลัก (Parent)</label>
                                <select
                                    value={formData.parent}
                                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- ไม่มี (Root Category) --</option>
                                    {categories
                                        .filter(c => c._id !== editingCategory?._id) // Prevent selecting self
                                        .map(c => (
                                            <option key={c._id} value={c._id}>
                                                {'- '.repeat(c.level)} {c.name}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
