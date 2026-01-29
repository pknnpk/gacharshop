'use client';

import { useState } from 'react';
import { Search, Package, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

export default function TrackingPage() {
    const [orderId, setOrderId] = useState('');
    const [phone, setPhone] = useState(''); // In a real app we might verify this against the order
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`/api/tracking?orderId=${orderId}&phone=${phone}`);
            if (!res.ok) {
                throw new Error('Order not found or details incorrect');
            }
            const data = await res.json();
            setResult(data);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-6 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white">Track Your Order</h1>
                    <p className="text-indigo-100 mt-2">Enter your order details below</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="e.g. 660c..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Searching...' : <><Search className="w-4 h-4" /> Track Order</>}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-500 text-sm">Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                                        result.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                                            result.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                                'bg-green-100 text-green-800'
                                    }`}>
                                    {result.status.toUpperCase()}
                                </span>
                            </div>

                            {result.trackingInfo?.trackingNumber && (
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2 text-indigo-700">
                                        <Package className="w-4 h-4" />
                                        <span className="font-medium text-sm">Tracking Info</span>
                                    </div>
                                    <p className="text-sm text-gray-800 font-mono">{result.trackingInfo.trackingNumber}</p>
                                    <p className="text-xs text-gray-500">{result.trackingInfo.courier}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
