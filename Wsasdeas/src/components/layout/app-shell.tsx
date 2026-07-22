'use client';

/** الهيكل العام للوحة: الشريط الجانبي + الشريط العلوي + منطقة المحتوى. */

import { useEffect, useState, type ReactNode } from 'react';

import { useStore } from '@/providers/store-provider';
import { AuthScreen } from '@/components/auth/auth-screen';
import { PendingScreen } from '@/components/auth/pending-screen';
import { Skeleton } from '@/components/ui/primitives';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { data, authState } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // مزامنة الإعدادات مع عنصر <html> — الوضع الليلي، لون التمييز، والحركات.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = data.settings.theme;
    root.style.setProperty('--accent', data.settings.accentColor);
    // تحويل لون التمييز إلى نسخة شفافة تُستخدم في الخلفيات الخفيفة.
    root.style.setProperty('--accent-soft', hexToSoft(data.settings.accentColor));
    root.classList.toggle('no-animations', !data.settings.animations);
  }, [data.settings]);

  // ترتيب الحالات: تحميل ← لا جلسة ← بانتظار التفعيل ← النظام الكامل
  if (authState === 'loading') return <ShellSkeleton />;
  if (authState === 'guest') return <AuthScreen />;
  if (authState === 'pending') return <PendingScreen />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main
          className={cnMain(data.settings.density)}
          // مفتاح يعيد تشغيل أنيميشن الدخول عند كل تنقّل بين الصفحات
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function cnMain(density: 'comfortable' | 'compact'): string {
  return [
    'flex-1 w-full mx-auto max-w-[1600px]',
    density === 'compact' ? 'p-3 sm:p-4 space-y-4' : 'p-4 sm:p-6 space-y-6',
  ].join(' ');
}

/** يحوّل لون hex إلى rgba خفيف للاستخدام كخلفية. */
function hexToSoft(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'rgb(99 102 241 / 0.14)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${r} ${g} ${b} / 0.14)`;
}

/** هيكل تحميل يظهر أثناء قراءة البيانات من التخزين المحلي. */
function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-68 shrink-0 border-l border-border bg-bg-soft p-4 lg:block">
        <Skeleton className="h-9 w-full" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-9 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 w-full" />
      </div>
    </div>
  );
}
