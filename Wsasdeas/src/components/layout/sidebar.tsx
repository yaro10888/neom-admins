'use client';

/** الشريط الجانبي — يعرض فقط الأقسام المسموح بها لرتبة المستخدم الحالي. */

import { Gamepad2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { NAV_SECTIONS } from './nav-config';

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { can, data, currentMember, isSupreme } = useStore();

  // إخفاء الأقسام غير المسموح بها، ثم إخفاء أي مجموعة أصبحت فارغة.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.resource, item.action ?? 'view')),
  })).filter((section) => section.items.length > 0);

  const department = data.departments.find((d) => d.id === currentMember?.departmentId);

  return (
    <>
      {/* طبقة معتمة خلف القائمة على الجوال */}
      {open ? (
        <div
          className="animate-[var(--animate-fade-in)] fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-68 flex-col border-l border-border bg-bg-soft',
          'transition-transform duration-300 ease-out lg:static lg:translate-x-0 print:hidden',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        {/* الشعار */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Gamepad2 className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-text">
                {data.settings.studioName}
              </span>
              <span className="block text-[10px] text-faint">نظام الإدارة</span>
            </span>
          </Link>

          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* عناصر التنقّل */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wide text-faint">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                          active
                            ? 'bg-accent-soft font-medium text-accent'
                            : 'text-muted hover:bg-surface-2 hover:text-text',
                        )}
                      >
                        <item.icon
                          className={cn(
                            'size-4.5 shrink-0 transition-transform duration-150',
                            !active && 'group-hover:scale-110',
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {active ? (
                          <span className="mr-auto block h-4 w-0.5 rounded-full bg-accent" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* بطاقة المستخدم الحالي */}
        {currentMember ? (
          <div className="shrink-0 border-t border-border p-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: department?.color ?? 'var(--accent)' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text">{currentMember.name}</p>
                <p className="truncate text-[10px] text-faint">
                  {department?.name ?? 'بدون إدارة'}
                </p>
              </div>
              {isSupreme ? (
                <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium text-accent">
                  صلاحية كاملة
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
