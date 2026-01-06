'use client';

import { Bell, Package, Tag, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NotificationsPage() {
    const { language } = useLanguage();

    // Mock Notifications
    const notifications = [
        {
            id: 1,
            type: 'promo',
            title: language === 'th' ? 'ลดราคาพิเศษ 50%!' : 'Special 50% Sale!',
            message: language === 'th' ? 'เฉพาะวันนี้เท่านั้น รีบช้อปเลย' : 'Today only! Shop now before it\'s gone.',
            date: '2 hours ago',
            icon: Tag,
            color: 'bg-gachar-red text-white'
        },
        {
            id: 2,
            type: 'order',
            title: language === 'th' ? 'คำสั่งซื้อจัดส่งแล้ว' : 'Order Shipped',
            message: language === 'th' ? 'สินค้าของคุณกำลังเดินทาง' : 'Your package is on the way.',
            date: '1 day ago',
            icon: Package,
            color: 'bg-gachar-blue text-white'
        },
        {
            id: 3,
            type: 'system',
            title: language === 'th' ? 'ยินดีต้อนรับสู่ GacharShop' : 'Welcome to GacharShop',
            message: language === 'th' ? 'ขอบคุณที่สมัครสมาชิกกับเรา' : 'Thanks for joining us!',
            date: '2 days ago',
            icon: Info,
            color: 'bg-gachar-yellow text-gray-800'
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8 pb-20">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Bell className="w-6 h-6 text-gachar-red" />
                {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
            </h1>

            <div className="space-y-4">
                {notifications.map((notif) => {
                    const Icon = notif.icon;
                    return (
                        <div key={notif.id} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className={`p-3 rounded-full h-fit ${notif.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                <span className="text-xs text-gray-400 mt-2 block">{notif.date}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
