'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Users, BarChart, Settings, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session || session.user?.role !== 'admin') {
            router.replace('/'); // Redirect non-admins to home
        } else {
            setIsAuthorized(true);
        }
    }, [session, status, router]);

    if (status === 'loading' || !isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gachar-blue mx-auto mb-4"></div>
                    <p className="text-gray-500">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ShieldAlert className="text-gachar-blue" />
                        แดชบอร์ดผู้ดูแล
                    </h1>
                    <p className="text-gray-500 mt-2">จัดการร้านค้า คลังสินค้า และผู้ใช้งาน</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Inventory Management Card */}
                    <Link href="/admin/inventory" className="block group">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full">
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Package className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">คลังสินค้า</h2>
                            <p className="text-gray-500 text-sm">จัดการสต็อกสินค้า ตำแหน่งจัดเก็บ และปรับยอด</p>
                        </div>
                    </Link>

                    {/* Placeholder for Analytics */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60 cursor-not-allowed">
                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                            <BarChart className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">ภาพรวม (เร็วๆ นี้)</h2>
                        <p className="text-gray-500 text-sm">ดูยอดขายและสถิติผู้เข้าชม</p>
                    </div>

                    {/* Placeholder for Users */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60 cursor-not-allowed">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 mb-4">
                            <Users className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">ผู้ใช้งาน (เร็วๆ นี้)</h2>
                        <p className="text-gray-500 text-sm">จัดการบัญชีผู้ใช้และสิทธิ์</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
