'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Folder, MapPin, Box } from 'lucide-react';
import toast from 'react-hot-toast';

interface Location {
    _id: string;
    name: string;
    type: string;
    parent: string | null;
    children?: Location[];
    description?: string;
    isActive: boolean;
}

export default function LocationManager() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoc, setEditingLoc] = useState<Location | null>(null);
    const [parentId, setParentId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'warehouse',
        description: '',
        parent: ''
    });

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/locations');
            if (!res.ok) throw new Error('Failed to fetch locations');
            const data = await res.json();
            setLocations(buildTree(data));
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลสถานที่ได้');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const buildTree = (flatLocations: Location[]): Location[] => {
        const map: Record<string, Location> = {};
        const roots: Location[] = [];

        // Initialize map
        flatLocations.forEach(loc => {
            map[loc._id] = { ...loc, children: [] };
        });

        // Build hierarchy
        flatLocations.forEach(loc => {
            if (loc.parent && map[loc.parent]) {
                map[loc.parent].children?.push(map[loc._id]);
            } else {
                roots.push(map[loc._id]);
            }
        });

        return roots;
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenModal = (parent: string | null = null, editLoc: Location | null = null) => {
        setParentId(parent);
        setEditingLoc(editLoc);

        if (editLoc) {
            setFormData({
                name: editLoc.name,
                type: editLoc.type,
                description: editLoc.description || '',
                parent: editLoc.parent || ''
            });
        } else {
            setFormData({
                name: '',
                type: parent ? 'shelf' : 'warehouse', // smart default
                description: '',
                parent: parent || ''
            });
        }

        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                parent: formData.parent || null // Ensure empty string becomes null
            };

            const url = editingLoc ? '/api/admin/locations' : '/api/admin/locations';
            const method = editingLoc ? 'PUT' : 'POST';
            const body = editingLoc ? { _id: editingLoc._id, ...payload } : payload;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Operation failed');
            }

            toast.success(editingLoc ? 'อัปเดตเรียบร้อย' : 'สร้างสถานที่เรียบร้อย');
            setIsModalOpen(false);
            fetchLocations();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบ? หากมีสถานที่ย่อย ข้อมูลอาจสูญหาย')) return;

        try {
            const res = await fetch(`/api/admin/locations?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');

            toast.success('ลบเรียบร้อย');
            fetchLocations();
        } catch (error) {
            toast.error('ลบไม่สำเร็จ');
        }
    };

    // Recursive Tree Node Component
    const TreeNode = ({ node, level = 0 }: { node: Location, level?: number }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded[node._id];

        return (
            <div className="select-none">
                <div
                    className={`flex items-center justify-between p-3 mb-1 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors ${level > 0 ? 'ml-6 border-l-2 border-l-gray-200' : ''}`}
                >
                    <div className="flex items-center gap-2 flex-1">
                        <button
                            onClick={() => toggleExpand(node._id)}
                            className={`p-1 rounded hover:bg-gray-200 text-gray-500 ${!hasChildren ? 'invisible' : ''}`}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <div className={`p-2 rounded-lg ${node.type === 'warehouse' ? 'bg-blue-50 text-blue-600' :
                            node.type === 'store' ? 'bg-green-50 text-green-600' :
                                'bg-amber-50 text-amber-600'
                            }`}>
                            {node.type === 'warehouse' ? <MapPin className="w-4 h-4" /> :
                                node.type === 'store' ? <Folder className="w-4 h-4" /> :
                                    <Box className="w-4 h-4" />}
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href={`/admin/locations/${node._id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
                                {node.name}
                            </Link>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{node.type}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleOpenModal(node._id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Add Sub-location"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleOpenModal(node.parent, node)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDelete(node._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {isExpanded && node.children && (
                    <div className="relative">
                        {/* Vertical line helper if needed */}
                        {/* <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" /> */}
                        {node.children.map(child => (
                            <TreeNode key={child._id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MapPin className="text-gachar-blue" />
                    จัดการสถานที่ (Locations)
                </h1>
                <button
                    onClick={() => handleOpenModal(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> สร้างสถานที่หลัก
                </button>
            </div>

            <div className="space-y-2 group">
                {locations.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">ยังไม่มีข้อมูลสถานที่</p>
                        <button onClick={() => handleOpenModal(null)} className="mt-4 text-gachar-blue hover:underline">
                            สร้างสถานที่แรกของคุณ
                        </button>
                    </div>
                ) : (
                    locations.map(loc => (
                        <TreeNode key={loc._id} node={loc} />
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md transform transition-all">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            {editingLoc ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-green-500" />}
                            {editingLoc ? 'แก้ไขสถานที่' : parentId ? 'เพิ่มสถานที่ย่อย' : 'สร้างสถานที่ใหม่'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสถานที่</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="เช่น คลังสินค้า A, ชั้นวาง B2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="warehouse">Warehouse (คลังสินค้าหลัก)</option>
                                    <option value="store">Store (หน้าร้าน)</option>
                                    <option value="zone">Zone (โซน)</option>
                                    <option value="aisle">Aisle (ทางเดิน/ล็อค)</option>
                                    <option value="shelf">Shelf (ชั้นวาง)</option>
                                    <option value="bin">Bin (ช่องเก็บของ)</option>
                                    <option value="virtual">Virtual (เสมือน)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gachar-blue text-white rounded-lg hover:bg-blue-700 shadow-sm"
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
