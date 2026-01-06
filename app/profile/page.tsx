'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Package, Settings, LogOut, ChevronRight, Edit2, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { language, toggleLanguage } = useLanguage();

    const [orders, setOrders] = useState<any[]>([]);
    const [showOrders, setShowOrders] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login?callbackUrl=/profile');
        }
    }, [status, router]);

    // Fetch Orders on mount
    useEffect(() => {
        if (session) {
            fetch('/api/orders')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setOrders(data);
                    }
                })
                .catch(err => console.error('Error loading orders:', err));
        }
    }, [session]);

    if (status === 'loading') {
        return <div className="p-8 text-center bg-gray-50 min-h-screen pt-20">Loading...</div>;
    }

    if (!session) return null;

    return (
        <div className="bg-gray-50 min-h-screen pb-24">
            {/* Header / Profile Card */}
            <div className="bg-gradient-to-r from-gachar-blue to-blue-600 p-6 text-white pt-10 rounded-b-[2rem] shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        {session.user?.image ? (
                            <img
                                src={session.user.image}
                                alt="Profile"
                                className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-md"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white backdrop-blur-sm">
                                <User className="w-8 h-8" />
                            </div>
                        )}
                        <button className="absolute bottom-0 right-0 bg-white text-gachar-blue p-1.5 rounded-full shadow-md hover:bg-gray-50 transition-colors">
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">{session.user?.name || 'Guest User'}</h1>
                        <p className="text-blue-100 text-sm bg-black/10 px-2 py-0.5 rounded-full inline-block mt-1">{session.user?.email}</p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-around mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                        <span className="block font-bold text-lg">0</span>
                        <span className="text-xs text-blue-100 uppercase tracking-wide">{language === 'th' ? 'คูปอง' : 'Vouchers'}</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg">0</span>
                        <span className="text-xs text-blue-100 uppercase tracking-wide">{language === 'th' ? 'เหรียญ' : 'Coins'}</span>
                    </div>
                    <div className="text-center">
                        <span className="block font-bold text-lg">0</span>
                        <span className="text-xs text-blue-100 uppercase tracking-wide">{language === 'th' ? 'คะแนน' : 'Points'}</span>
                    </div>
                </div>
            </div>

            {/* Menu Lists */}
            <div className="px-4 mt-6 space-y-4">
                {/* My Purchases */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setShowOrders(!showOrders)}
                    >
                        <h2 className="font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-gachar-blue">
                                <Package className="w-5 h-5" />
                            </div>
                            {language === 'th' ? 'การซื้อของฉัน' : 'My Purchases'}
                        </h2>
                        <button className="text-xs text-gray-400 flex items-center hover:text-gachar-blue transition-colors">
                            {showOrders ? (language === 'th' ? 'ซ่อน' : 'Hide') : (language === 'th' ? 'ดูประวัติ' : 'View History')}
                            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showOrders ? 'rotate-90' : ''}`} />
                        </button>
                    </div>

                    {/* Collapsible Order List */}
                    {showOrders && (
                        <div className="border-t border-gray-100 bg-gray-50/50">
                            {orders.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    {language === 'th' ? 'ยังไม่มีประวัติการสั่งซื้อ' : 'No orders found'}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {orders.map((order: any) => (
                                        <div key={order._id} className="p-4 hover:bg-white transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-mono text-gray-400">#{order._id.slice(-6).toUpperCase()}</span>
                                                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 mt-1">
                                                {language === 'th' ? 'ยอดรวม' : 'Total'}: ฿{order.totalAmount.toLocaleString()}
                                            </div>
                                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                                {/* Placeholder for item thumbnails if we populated them fully, for now just item count */}
                                                <span className="text-xs text-gray-500">{order.items.length} items</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Account Settings */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    {/* Language Toggle */}
                    <div
                        className="p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={toggleLanguage}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{language === 'th' ? 'ภาษา / Language' : 'Language / ภาษา'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gachar-blue bg-blue-50 px-2 py-1 rounded-md">
                                {language.toUpperCase()}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>

                    <div className="p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => alert('Settings Feature Coming Soon!')}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                                <Settings className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{language === 'th' ? 'ตั้งค่าบัญชี' : 'Account Settings'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>

                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors text-red-600 group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-lg text-red-500 group-hover:bg-red-100 transition-colors">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">{language === 'th' ? 'ออกจากระบบ' : 'Log Out'}</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
