import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import UserNav from '@/components/UserNav';
import { product } from '@/lib/brand';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: product.name,
  description: product.metaDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <UserNav />
        {children}
      </body>
    </html>
  );
}
