'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    MapPin,
    Users,
    BarChart,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldAlert,
    Activity,
    Store,
    Box
} from 'lucide-react';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function AdminSidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const isActive = (path: string) => {
        if (path === '/admin' && pathname === '/admin') return true;
        if (path !== '/admin' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { name: 'ภาพรวม', path: '/admin', icon: LayoutDashboard },
        { name: 'สินค้า', path: '/admin/products', icon: Package },
        { name: 'คลังสินค้า', path: '/admin/inventory', icon: Box },
        { name: 'สถานที่', path: '/admin/locations', icon: MapPin },
        { name: 'ผู้ใช้งาน', path: '/admin/users', icon: Users, disabled: true },
        { name: 'สถิติ', path: '/admin/analytics', icon: BarChart, disabled: true },
        { name: 'ตั้งค่า', path: '/admin/settings', icon: Settings, disabled: true },
    ];

    return (
        <>
            {/* Mobile Trigger */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 shadow-xl md:shadow-none z-40
                transition-transform duration-300 ease-in-out font-outfit
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <ShieldAlert className="text-gachar-blue w-8 h-8" />
                    <span className="text-xl font-bold bg-gradient-to-r from-gachar-blue to-blue-600 bg-clip-text text-transparent">
                        ผู้ดูแลระบบ
                    </span>
                </div>

                <div className="flex flex-col h-[calc(100%-80px)] justify-between p-4">
                    <div className="space-y-6">
                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                const Icon = item.icon;

                                if (item.disabled) {
                                    return (
                                        <div key={item.path} className="flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed opacity-60">
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium text-sm">{item.name}</span>
                                        </div>
                                    )
                                }

                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                                            ${active
                                                ? 'bg-blue-50 text-gachar-blue font-semibold shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? 'fill-current opacity-20' : ''}`} />
                                        <span className="font-medium text-sm">{item.name}</span>
                                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gachar-blue" />}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Extra Links */}
                        <div className="pt-4 border-t border-gray-100 space-y-1">
                            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                ลิงก์ด่วน
                            </p>
                            <Link
                                href="/admin/health"
                                className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-green-600 rounded-lg transition-colors"
                            >
                                <Activity className="w-4 h-4" />
                                <span className="text-sm font-medium">Health Check</span>
                            </Link>
                            <Link
                                href="/"
                                className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <Store className="w-4 h-4" />
                                <span className="text-sm font-medium">หน้าร้านค้า</span>
                            </Link>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="px-4 py-4 mb-2 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">สถานะระบบ</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs text-gray-700 font-medium">ปกติ</span>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium text-sm">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
