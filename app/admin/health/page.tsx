import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { ShieldCheck, Database, Server, Key, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
    let status = 'Unknown';
    let error = null;
    let dbName = null;
    let readyState = -1;
    let modelState = '';
    let connectionHost = null;

    // Check Auth Configuration
    const authConfig = {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing',
        },
        line: {
            channelId: process.env.LINE_CHANNEL_ID ? 'Present' : 'Missing',
            channelSecret: process.env.LINE_CHANNEL_SECRET ? 'Present' : 'Missing',
        },
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'Present' : 'Missing',
    };

    try {
        const conn = await connectToDatabase();
        readyState = conn.readyState;
        dbName = conn.name;
        connectionHost = conn.host;

        // Test a simple query
        if (readyState === 1) {
            status = 'Connected';
            try {
                // Check if we can list collections (using any as a workaround for types)
                const adminDb = conn.db?.admin();
                // @ts-ignore
                const serverInfo = await adminDb?.serverStatus();
                modelState = serverInfo ? `Version: ${serverInfo.version}` : 'Server info unavailable';
            } catch (e: any) {
                modelState = `Query Error: ${e.message}`;
            }
        } else {
            status = `Disconnected (State: ${readyState})`;
        }

    } catch (e: any) {
        status = 'Error';
        error = e.message + (e.stack ? '\n' + e.stack : '');
    }

    const StatusIcon = status === 'Connected' ? CheckCircle : AlertTriangle;
    const statusColor = status === 'Connected' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-8 flex items-center gap-3 border-b pb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <ShieldCheck className="w-8 h-8 text-gachar-blue" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        สถานะระบบ (System Health)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">ตรวจสอบความพร้อมของระบบและฐานข้อมูล</p>
                </div>
            </header>

            <div className={`p-6 border rounded-xl shadow-sm mb-6 ${statusColor}`}>
                <div className="flex items-center gap-4">
                    <StatusIcon className="w-12 h-12" />
                    <div>
                        <p className="font-semibold opacity-75 uppercase tracking-wider text-xs">System Status</p>
                        <p className="text-2xl font-bold">{status === 'Connected' ? 'ระบบทำงานปกติ' : 'มีปัญหาการเชื่อมต่อ'}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="font-semibold opacity-75 uppercase tracking-wider text-xs">Database State</p>
                        <p className="text-xl font-mono">{readyState} <span className="text-sm font-normal opacity-75">(1=Connected)</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-gray-800">ข้อมูลฐานข้อมูล (Database)</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-500">DB Name</span>
                            <span className="font-mono text-gray-900 bg-gray-50 px-2 rounded">{dbName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-500">Host</span>
                            <span className="font-mono text-gray-900 bg-gray-50 px-2 rounded">{connectionHost || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-500">Mongoose Version</span>
                            <span className="font-mono text-gray-900 bg-gray-50 px-2 rounded">{mongoose.version}</span>
                        </div>
                        {modelState && (
                            <div className="pt-2 border-t mt-2">
                                <span className="font-medium text-gray-500 block mb-1">Server Info</span>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{modelState}</pre>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                        <Server className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold text-gray-800">การตั้งค่า (Environment)</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-500">Node Env</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 uppercase">{process.env.NODE_ENV}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-500">MongoDB URI</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${process.env.MONGODB_URI ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {process.env.MONGODB_URI ? 'Configured' : 'Missing'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4 border-b pb-2">
                    <Key className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-gray-800">การยืนยันตัวตน (Authentication)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Google Login
                        </h3>
                        <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Client ID</span>
                                <StatusBadge status={authConfig.google.clientId} />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Client Secret</span>
                                <StatusBadge status={authConfig.google.clientSecret} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Line Login
                        </h3>
                        <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Channel ID</span>
                                <StatusBadge status={authConfig.line.channelId} />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Channel Secret</span>
                                <StatusBadge status={authConfig.line.channelSecret} />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100">
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span> NextAuth Config
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">NextAuth URL</span>
                                <span className="font-mono text-sm break-all">{authConfig.nextAuthUrl || 'Missing'}</span>
                            </div>
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-400 uppercase tracking-wide">NextAuth Secret</span>
                                <StatusBadge status={authConfig.nextAuthSecret} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 border border-red-500 bg-red-100 text-red-900 rounded-xl overflow-hidden">
                    <h2 className="font-bold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Error Details
                    </h2>
                    <pre className="whitespace-pre-wrap text-xs font-mono overflow-auto max-h-96">{error}</pre>
                </div>
            )}

            <div className="text-xs text-gray-400 text-center mt-8">
                Last checked: {new Date().toLocaleString('th-TH')}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'Present') {
        return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Configured</span>
    }
    return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-bold"><XCircle className="w-3 h-3" /> Missing</span>
}
