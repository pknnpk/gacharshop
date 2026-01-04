
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Providers } from './providers';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'GacharShop - Premium E-Commerce',
  description: 'Your one-stop shop for premium gadgets, fashion, and lifestyle essentials.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-gray-50 flex flex-col min-h-screen" suppressHydrationWarning>
        <Providers>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
