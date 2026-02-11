'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Package, Settings, LogOut, ChevronRight, Edit2, Globe, CreditCard, Truck, Star, MapPin, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const { language, toggleLanguage } = useLanguage();

    const [orders, setOrders] = useState<any[]>([]);
    const [showOrders, setShowOrders] = useState(false);
    const [uploading, setUploading] = useState(false);

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // Increased limit to 5MB for GCS
            toast.error(language === 'th' ? 'ขนาดไฟล์ต้องไม่เกิน 5MB' : 'File size must be less than 5MB');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                body: formData, // No Content-Type header needed, browser sets it
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update image');
            }

            const updatedUser = await res.json();

            toast.success(language === 'th' ? 'อัปเดตแกรูปโปรไฟล์เรียบร้อย' : 'Profile image updated');

            // Update session with new image URL specifically if returned
            if (updatedUser.image) {
                await update({ image: updatedUser.image });
            }

            window.location.reload();
        } catch (error: any) {
            console.error("Upload Error Details:", error);
            if (error.message) toast.error(`Upload Failed: ${error.message}`);
            else toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

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
                        <label className={`absolute bottom-0 right-0 bg-white text-gachar-blue p-1.5 rounded-full shadow-md hover:bg-gray-50 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <Edit2 className="w-3 h-3" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{session.user?.name || 'Guest User'}</h1>
                            {session.user?.role === 'admin' && (
                                <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                    <ShieldAlert className="w-3 h-3" />
                                    ADMIN
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-blue-100 text-sm bg-black/10 px-2 py-0.5 rounded-full inline-block">
                                {session.user?.email || (language === 'th' ? 'ไม่มีอีเมล' : 'No Email')}
                            </p>
                            {session.user?.provider && (
                                <p className="text-blue-100 text-xs flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-full inline-block w-fit">
                                    <span className="opacity-75">{language === 'th' ? 'เข้าสู่ระบบโดย' : 'Logged in with'}</span>
                                    <span className="font-semibold capitalize">
                                        {session.user.provider === 'google' ? 'Google' :
                                            session.user.provider === 'line' ? 'LINE' :
                                                session.user.provider}
                                    </span>
                                </p>
                            )}
                        </div>
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
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                        onClick={() => setShowOrders(!showOrders)}
                    >
                        <h2 className="font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-gachar-blue">
                                <Package className="w-5 h-5" />
                            </div>
                            {language === 'th' ? 'การซื้อของฉัน' : 'My Purchases'}
                        </h2>
                        <button className="text-xs text-gray-400 flex items-center hover:text-gachar-blue transition-colors">
                            {language === 'th' ? 'ดูประวัติ' : 'View History'}
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>

                    {/* Order Status Icons Row (Shopee Style) */}
                    <div className="flex flex-row justify-between items-start py-4 px-2">
                        <div className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                            <div className="relative">
                                <CreditCard className="w-7 h-7 text-gray-700 stroke-[1.5]" />
                            </div>
                            <span className="text-xs text-center text-gray-700 leading-tight">{language === 'th' ? 'ที่ต้องชำระ' : 'To Pay'}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                            <div className="relative">
                                <Package className="w-7 h-7 text-gray-700 stroke-[1.5]" />
                            </div>
                            <span className="text-xs text-center text-gray-700 leading-tight">{language === 'th' ? 'ที่ต้องจัดส่ง' : 'To Ship'}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                            <div className="relative">
                                <Truck className="w-7 h-7 text-gray-700 stroke-[1.5]" />
                            </div>
                            <span className="text-xs text-center text-gray-700 leading-tight">{language === 'th' ? 'ที่ต้องได้รับ' : 'To Receive'}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
                            <div className="relative">
                                <Star className="w-7 h-7 text-gray-700 stroke-[1.5]" />
                            </div>
                            <span className="text-xs text-center text-gray-700 leading-tight">{language === 'th' ? 'ให้คะแนน' : 'To Rate'}</span>
                        </div>
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
                    {/* Admin Dashboard Link */}
                    {session.user?.role === 'admin' && (
                        <Link href="/admin" className="p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-yellow-400 group-hover:bg-slate-700 transition-colors">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">{language === 'th' ? 'แดชบอร์ดผู้ดูแล' : 'Admin Dashboard'}</span>
                                    <span className="text-[10px] text-gray-400">Manage products, inventory & orders</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </Link>
                    )}

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

                    {/* Address Book */}
                    <Link href="/profile/addresses" className="p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{language === 'th' ? 'ที่อยู่ของฉัน' : 'My Addresses'}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>

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
