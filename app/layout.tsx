import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import UserNav from '@/components/UserNav';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Unicorn Factory',
  description:
    'Turn your idea into a working MVP in 72 hours. Refine your idea free, we engineer your MVP, then hand it over — or run it for you.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <UserNav />
        {children}
      </body>
    </html>
  );
}
