import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />

            <main className="flex-1 md:ml-64 transition-all duration-300">
                <div className="p-4 md:p-8 pt-16 md:pt-8 min-h-screen">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[calc(100vh-4rem)] overflow-hidden">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
