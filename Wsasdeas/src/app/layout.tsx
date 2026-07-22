import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';

import { AppShell } from '@/components/layout/app-shell';
import { StoreProvider } from '@/providers/store-provider';
import './globals.css';

const cairo = Cairo({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'نظام إدارة استوديو ألعاب Roblox',
  description:
    'لوحة تحكم متكاملة لإدارة الإدارات والرتب والمطورين والمشاريع والمهام والمالية داخل استوديو تطوير ألعاب Roblox.',
};

export const viewport: Viewport = {
  themeColor: '#0a0c11',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // dir=rtl لأن الواجهة عربية بالكامل، والوضع الليلي هو الافتراضي
    // ويُضبط هنا مباشرة لتفادي وميض أبيض قبل تحميل الإعدادات المحفوظة.
    <html lang="ar" dir="rtl" data-theme="dark" className={cairo.variable}>
      <body className="antialiased">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
