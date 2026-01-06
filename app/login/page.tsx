'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    const handleLogin = (provider: string) => {
        signIn(provider, { callbackUrl });
    };

    return (
        <div className="container mx-auto px-4 py-20 max-w-md text-center">
            <h1 className="text-3xl font-bold mb-8">Welcome Back</h1>
            <p className="text-gray-500 mb-8">Please sign in to continue knowing your cart details.</p>

            <div className="space-y-4">
                <button
                    onClick={() => handleLogin('google')}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm"
                >
                    {/* Google Icon SVG */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                <button
                    onClick={() => handleLogin('line')}
                    className="w-full flex items-center justify-center gap-3 bg-[#00B900] text-white hover:bg-[#009900] font-semibold py-3 px-4 rounded-xl transition-all shadow-sm"
                >
                    {/* Line Icon SVG (Simplified) */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M20.6 10c-1.3-4.4-5.2-7.4-9.9-7.4-5.8 0-10.6 4.5-10.6 10s4.8 10 10.6 10c1 0 2-.1 3-.3.3 0 .5.1.7.3 1 .8 2.6.9 2.6.9s.1 0 .1-.1c0 0 .1-1.3-.3-2.5-.1-.3-.1-.5 0-.8 1.9-2.2 2.8-5.3 1.5-8.1zm-15.2 2.7c-.5 0-.8-.4-.8-.9v-3.7c0-.5.4-.9.8-.9s.8.4.8.9v3.7c0 .5-.4.9-.8.9zm3.5 0c-.5 0-.8-.4-.8-.9v-3.7c0-.5.4-.9.8-.9s.8.4.8.9v3.7c0 .5-.3.9-.8.9zm5.3-.9v-2.8h1.4c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9h-2.2c-.5 0-.9.4-.9.9v3.7c0 .5.4.9.9.9s.8-.4.8-.9zm3.6 0v-1h1.4c.5 0 .9-.4.9-.9s-.4-.9-.9-.9h-1.4v-.9c0-.5-.4-.9-.9-.9s-.9.4-.9.9v3.7c0 .5.4.9.9.9h2.2c.5 0 .9-.4.9-.9s-.4-.9-.9-.9h-1.3z" />
                    </svg>
                    Continue with LINE
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
