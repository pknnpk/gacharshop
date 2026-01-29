'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw, Plus, Minus, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryDashboard() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adjusting, setAdjusting] = useState<string | null>(null); // Product ID being adjusted

    // Adjustment Modal State
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
    const [adjustmentQty, setAdjustmentQty] = useState(1);
    const [adjustmentReason, setAdjustmentReason] = useState('');

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/inventory');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            toast.error('Could not load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleOpenAdjust = (product: any, type: 'add' | 'remove') => {
        setSelectedProduct(product);
        setAdjustmentType(type);
        setAdjustmentQty(1);
        setAdjustmentReason('');
    };

    const submitAdjustment = async () => {
        if (!selectedProduct) return;

        try {
            const change = adjustmentType === 'add' ? adjustmentQty : -adjustmentQty;

            const res = await fetch('/api/admin/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct._id,
                    change: change,
                    reason: adjustmentReason || (adjustmentType === 'add' ? 'Manual Restock' : 'Manual Removal')
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed');

            toast.success('Stock updated!');
            setSelectedProduct(null);
            fetchInventory(); // Refresh

        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Inventory...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Package /> Inventory Management
                </h1>
                <button onClick={fetchInventory} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium text-gray-500">Product</th>
                            <th className="p-4 font-medium text-gray-500">SKU</th>
                            <th className="p-4 font-medium text-gray-500 text-center">Total</th>
                            <th className="p-4 font-medium text-gray-500 text-center">Reserved</th>
                            <th className="p-4 font-medium text-gray-500 text-center">Available</th>
                            <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(p => (
                            <tr key={p._id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{p.name}</td>
                                <td className="p-4 text-gray-500 font-mono text-sm">{p.sku}</td>
                                <td className="p-4 text-center">{p.totalStock}</td>
                                <td className="p-4 text-center text-yellow-600 font-medium">
                                    {p.reserved > 0 ? p.reserved : '-'}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${p.available < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                        }`}>
                                        {p.available}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button
                                        onClick={() => handleOpenAdjust(p, 'add')}
                                        className="inline-flex items-center px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                    </button>
                                    <button
                                        onClick={() => handleOpenAdjust(p, 'remove')}
                                        className="inline-flex items-center px-2 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100">
                                        <Minus className="w-3 h-3 mr-1" /> Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Adjustment Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">
                            {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}: {selectedProduct.name}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={adjustmentQty}
                                    onChange={e => setAdjustmentQty(parseInt(e.target.value))}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Reason / Note</label>
                                <textarea
                                    value={adjustmentReason}
                                    onChange={e => setAdjustmentReason(e.target.value)}
                                    className="w-full border p-2 rounded"
                                    placeholder="e.g. New Shipment"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                    Cancel
                                </button>
                                <button
                                    onClick={submitAdjustment}
                                    className={`px-4 py-2 text-white rounded ${adjustmentType === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                                        }`}>
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
