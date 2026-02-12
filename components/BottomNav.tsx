'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Bell, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { dictionary } from '../dictionaries';

export default function BottomNav() {
    const pathname = usePathname();
    const { language } = useLanguage();
    const t = dictionary[language].bottomNav;

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        {
            name: t.home,
            path: '/',
            icon: Home
        },
        {
            name: t.mall,
            path: '/products',
            icon: ShoppingBag
        },
        {
            name: t.notify,
            path: '/notifications',
            icon: Bell
        },
        {
            name: t.me,
            path: '/profile',
            icon: User
        }
    ];

    // Hide on profile sub-pages
    if ((pathname.startsWith('/profile') && pathname !== '/profile') || pathname.startsWith('/admin')) {
        return null; // Return null to render nothing
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${active
                                ? 'text-gachar-red'
                                : 'text-gray-400 hover:text-gachar-blue'
                                }`}
                        >
                            <Icon
                                className={`w-6 h-6 transition-transform duration-200 ${active ? 'fill-current scale-110' : ''}`}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
