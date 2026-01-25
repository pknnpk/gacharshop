'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Trash2, Edit, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';

// ... (keep interface) -> REPLACE WITH ACTUAL INTERFACE
interface Address {
    _id: string;
    name: string;
    phone: string;
    addressLine: string;
    subDistrict: string;
    district: string;
    province: string;
    zipCode: string;
    isDefault: boolean;
}

export default function AddressBookPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { language } = useLanguage();

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            const res = await fetch('/api/user/addresses');
            if (res.ok) {
                const data = await res.json();
                setAddresses(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(language === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบที่อยู่นี้?' : 'Are you sure you want to delete this address?')) return;

        try {
            const res = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAddresses(prev => prev.filter(a => a._id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen pt-20">{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-6 flex items-center gap-3">
                    <button onClick={() => router.back()} className="text-gachar-red">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold">{language === 'th' ? 'ที่อยู่ของฉัน' : 'My Addresses'}</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {addresses.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>{language === 'th' ? 'ไม่พบที่อยู่' : 'No addresses found.'}</p>
                        <p className="text-sm">{language === 'th' ? 'เพิ่มที่อยู่เพื่อการจัดส่งที่รวดเร็ว!' : 'Add one to speed up checkout!'}</p>
                    </div>
                ) : (
                    addresses.map(addr => (
                        <Link key={addr._id} href={`/profile/addresses/${addr._id}`}>
                            <div className="bg-white p-4 bg-white border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-gray-900 text-sm">{addr.name}</span>
                                    <span className="text-gray-300 text-sm">|</span>
                                    <span className="text-gray-500 text-sm">{addr.phone}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                                    {addr.addressLine}<br />
                                    {addr.subDistrict}, {addr.district}, {addr.province}, {addr.zipCode}
                                </p>

                                <div className="flex flex-wrap gap-2 justify-between items-end">
                                    {addr.isDefault && (
                                        <span className="text-[10px] text-gachar-red border border-gachar-red px-1.5 py-0.5 rounded-sm">
                                            {language === 'th' ? 'ค่าเริ่มต้น' : 'Default'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Bottom Add Button (Shopee Style) */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 safe-area-pb">
                <div className="px-4 py-2">
                    <Link
                        href="/profile/addresses/add"
                        className="flex items-center justify-center gap-2 w-full bg-white border border-gachar-red text-gachar-red font-medium py-2.5 rounded hover:bg-red-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {language === 'th' ? 'เพิ่มที่อยู่ใหม่' : 'Add New Address'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
