'use client';

/** الشريط العلوي: القائمة، البحث العالمي، الإشعارات، تبديل الوضع، وحساب المستخدم. */

import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Info,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCog,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { buildNotifications, type NotificationLevel } from '@/core/services/selectors';
import { cn } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { Avatar } from '@/components/ui/primitives';
import { GlobalSearch } from './global-search';

const LEVEL_STYLES: Record<NotificationLevel, { icon: typeof Info; className: string }> = {
  danger: { icon: AlertTriangle, className: 'text-rose-400 bg-rose-500/12' },
  warning: { icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/12' },
  info: { icon: Info, className: 'text-sky-400 bg-sky-500/12' },
};

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { data, currentMember, updateSettings, signOut, isSupreme } = useStore();

  const notifications = useMemo(() => buildNotifications(data), [data]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountsRef = useRef<HTMLDivElement>(null);

  // إغلاق القوائم المنسدلة عند النقر خارجها
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!notificationsRef.current?.contains(target)) setShowNotifications(false);
      if (!accountsRef.current?.contains(target)) setShowAccounts(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const isDark = data.settings.theme === 'dark';
  const criticalCount = notifications.filter((n) => n.level === 'danger').length;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-lg print:hidden">
      <button
        onClick={onOpenMenu}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="size-5" />
      </button>

      <GlobalSearch />

      <div className="mr-auto flex items-center gap-1.5">
        {/* تبديل الوضع الليلي/الفاتح */}
        <button
          onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label={isDark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الليلي'}
          title={isDark ? 'الوضع الفاتح' : 'الوضع الليلي'}
        >
          {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </button>

        {/* الإشعارات */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications((value) => !value)}
            className="relative grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label={`الإشعارات (${notifications.length})`}
          >
            <Bell className="size-4.5" />
            {notifications.length > 0 ? (
              <span
                className={cn(
                  'absolute top-1.5 left-1.5 grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white',
                  criticalCount > 0 ? 'bg-rose-500' : 'bg-amber-500',
                )}
              >
                {notifications.length > 99 ? '99+' : notifications.length}
              </span>
            ) : null}
          </button>

          {showNotifications ? (
            <div className="animate-[var(--animate-scale-in)] absolute top-11 left-0 z-50 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 sm:w-96">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text">مركز الإشعارات</p>
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">
                  {notifications.length}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-faint">
                    لا توجد إشعارات — كل شيء تحت السيطرة.
                  </p>
                ) : (
                  notifications.map((notification) => {
                    const style = LEVEL_STYLES[notification.level];
                    return (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg',
                            style.className,
                          )}
                        >
                          <style.icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-text">
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                            {notification.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* حساب المستخدم — يسمح بتجربة النظام بصلاحيات رتب مختلفة */}
        <div ref={accountsRef} className="relative">
          <button
            onClick={() => setShowAccounts((value) => !value)}
            className="flex items-center gap-2 rounded-lg py-1 pr-1 pl-2 transition-colors hover:bg-surface-2"
          >
            {currentMember ? (
              <Avatar
                name={currentMember.name}
                color={currentMember.avatarColor}
                size="sm"
              />
            ) : null}
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-medium text-text">
                {currentMember?.name ?? 'زائر'}
              </span>
              <span className="block text-[10px] text-faint">
                {data.ranks.find((r) => r.id === currentMember?.rankId)?.name ?? '—'}
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-faint" />
          </button>

          {showAccounts ? (
            <div className="animate-[var(--animate-scale-in)] absolute top-12 left-0 z-50 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40">
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {currentMember ? (
                    <Avatar
                      name={currentMember.name}
                      color={currentMember.avatarColor}
                      size="md"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">
                      {currentMember?.name ?? '—'}
                    </p>
                    <p className="truncate text-[11px] text-faint">
                      {currentMember?.email ?? ''}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-muted">
                  <p className="flex items-center gap-1.5">
                    <UserCog className="size-3" />
                    {data.ranks.find((r) => r.id === currentMember?.rankId)?.name ?? 'بلا رتبة'}
                    {' — '}
                    {data.departments.find((d) => d.id === currentMember?.departmentId)?.name ??
                      'بلا إدارة'}
                  </p>
                  {currentMember?.discordUsername ? (
                    <p>ديسكورد: {currentMember.discordUsername}</p>
                  ) : null}
                  {isSupreme ? (
                    <p className="text-accent">تملك صلاحيات كاملة على النظام</p>
                  ) : null}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAccounts(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-right text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                <LogOut className="size-3.5" />
                تسجيل الخروج
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
