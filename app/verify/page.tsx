
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import mongoose from "mongoose";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getDbStatus() {
    try {
        const conn = await connectToDatabase();
        return {
            status: 'Connected',
            name: conn.name,
            host: conn.host,
            models: mongoose.modelNames()
        };
    } catch (e: any) {
        return { status: 'Error', error: e.message };
    }
}

export default async function VerifyPage() {
    const session = await getServerSession(authOptions);
    const dbStatus = await getDbStatus();

    return (
        <div className="min-h-screen p-8 font-sans max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Phase 1 Verification</h1>

            <section className="mb-8 p-6 bg-gray-50 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">1. Database Connection</h2>
                <div className="space-y-2">
                    <p><strong>Status:</strong> <span className={dbStatus.status === 'Connected' ? "text-green-600 font-bold" : "text-red-600"}>{dbStatus.status}</span></p>
                    {dbStatus.status === 'Connected' && (
                        <>
                            <p><strong>Database Name:</strong> {dbStatus.name}</p>
                            <p><strong>Registered Models:</strong> {dbStatus.models?.join(', ')}</p>
                        </>
                    )}
                    {dbStatus.error && <p className="text-red-500">{dbStatus.error}</p>}
                </div>
            </section>

            <section className="mb-8 p-6 bg-gray-50 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">2. Authentication</h2>

                {session ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded">
                            <p className="text-green-800 font-bold">✅ Signed In</p>
                            <p><strong>Name:</strong> {session.user?.name}</p>
                            <p><strong>Email:</strong> {session.user?.email}</p>
                            <p><strong>ID:</strong> {session.user?.id}</p>
                            <p><strong>Role:</strong> {session.user?.role}</p>
                        </div>
                        <Link
                            href="/api/auth/signout"
                            className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Sign Out
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-yellow-800">⚪ Not Signed In</p>
                        </div>
                        <Link
                            href="/api/auth/signin"
                            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Sign In
                        </Link>
                    </div>
                )}
            </section>

            <section className="text-sm text-gray-500 mt-12">
                <p>Environment Check:</p>
                <ul className="list-disc ml-5">
                    <li>NEXT_PUBLIC_APP_URL: {process.env.NEXT_PUBLIC_APP_URL || '(Not set)'}</li>
                    <li>NODE_ENV: {process.env.NODE_ENV}</li>
                </ul>
            </section>
        </div>
    );
}
