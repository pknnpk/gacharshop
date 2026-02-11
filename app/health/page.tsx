
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
    let status = 'Unknown';
    let error = null;
    let dbName = null;
    let readyState = -1;
    let modelState = 'Unknown';
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
                // Check if we can list collections
                const collections = await conn.db?.listCollections().toArray() || [];
                modelState = `Collections: ${collections.map(c => c.name).join(', ')}`;
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

    return (
        <div className="p-8 font-mono max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">System Health Check</h1>

            <div className={`p-6 border-l-4 rounded shadow-sm mb-6 ${status === 'Connected' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-red-50 border-red-500 text-red-900'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="font-semibold opacity-75">Status</p>
                        <p className="text-xl font-bold">{status}</p>
                    </div>
                    <div>
                        <p className="font-semibold opacity-75">ReadyState</p>
                        <p className="text-xl">{readyState} <span className="text-sm font-normal opacity-75">(1=Connected)</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 border rounded bg-white shadow-sm">
                    <h2 className="text-lg font-bold mb-3 border-b pb-2">Database Details</h2>
                    <div className="space-y-2">
                        <p><span className="font-semibold text-gray-600">DB Name:</span> {dbName || 'N/A'}</p>
                        <p><span className="font-semibold text-gray-600">Host:</span> {connectionHost || 'N/A'}</p>
                        <p><span className="font-semibold text-gray-600">Mongoose Version:</span> {mongoose.version}</p>
                    </div>
                </div>

                <div className="p-4 border rounded bg-white shadow-sm">
                    <h2 className="text-lg font-bold mb-3 border-b pb-2">Configuration</h2>
                    <div className="space-y-2">
                        <p><span className="font-semibold text-gray-600">MONGODB_URI:</span> {process.env.MONGODB_URI ? 'Definied (Hidden)' : 'Missing'}</p>
                        <p><span className="font-semibold text-gray-600">NODE_ENV:</span> {process.env.NODE_ENV}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 border rounded bg-white shadow-sm mb-6">
                <h2 className="text-lg font-bold mb-3 border-b pb-2">Auth Integration Checks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Google Login</h3>
                        <ul className="list-disc list-inside text-sm">
                            <li>Client ID: <span className={authConfig.google.clientId === 'Present' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{authConfig.google.clientId}</span></li>
                            <li>Client Secret: <span className={authConfig.google.clientSecret === 'Present' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{authConfig.google.clientSecret}</span></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Line Login</h3>
                        <ul className="list-disc list-inside text-sm">
                            <li>Channel ID: <span className={authConfig.line.channelId === 'Present' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{authConfig.line.channelId}</span></li>
                            <li>Channel Secret: <span className={authConfig.line.channelSecret === 'Present' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{authConfig.line.channelSecret}</span></li>
                        </ul>
                    </div>
                    <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t">
                        <h3 className="font-semibold text-gray-700 mb-2">NextAuth Config</h3>
                        <ul className="list-disc list-inside text-sm">
                            <li>NEXTAUTH_URL: <span className="font-mono">{authConfig.nextAuthUrl || 'Missing'}</span></li>
                            <li>NEXTAUTH_SECRET: <span className={authConfig.nextAuthSecret === 'Present' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{authConfig.nextAuthSecret}</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            {modelState && (
                <div className="mb-6 p-4 border rounded bg-blue-50 text-blue-900">
                    <h2 className="text-lg font-bold mb-2">Operation Test (List Collections)</h2>
                    <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-40 bg-blue-100 p-2 rounded">{modelState}</pre>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 border border-red-500 bg-red-100 text-red-900 rounded overflow-hidden">
                    <h2 className="font-bold mb-2">Error Details</h2>
                    <pre className="whitespace-pre-wrap text-xs font-mono overflow-auto max-h-96">{error}</pre>
                </div>
            )}

            <div className="text-xs text-gray-400 text-center mt-12 border-t pt-4">
                Generated at {new Date().toISOString()}
            </div>
        </div>
    );
}
