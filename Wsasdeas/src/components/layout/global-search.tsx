'use client';

/** البحث العالمي — يبحث في كل كيانات النظام المسموح بها للمستخدم. */

import {
  Building2,
  CheckSquare,
  FolderKanban,
  Megaphone,
  Search,
  StickyNote,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { globalSearch } from '@/core/services/search';
import { cn } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';

const RESULT_ICONS: Record<string, LucideIcon> = {
  user: User,
  folder: FolderKanban,
  'check-square': CheckSquare,
  building: Building2,
  wallet: Wallet,
  megaphone: Megaphone,
  'sticky-note': StickyNote,
};

export function GlobalSearch() {
  const { data, can } = useStore();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => globalSearch(data, query, (resource) => can(resource, 'view')),
    [data, query, can],
  );

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // اختصار Ctrl+K لفتح البحث
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex].href);
    }
  }

  // تجميع النتائج حسب النوع مع الاحتفاظ بالترتيب العام للتنقّل بالأسهم
  const grouped = useMemo(() => {
    const map = new Map<string, { result: (typeof results)[number]; index: number }[]>();
    results.forEach((result, index) => {
      const list = map.get(result.group) ?? [];
      list.push({ result, index });
      map.set(result.group, list);
    });
    return [...map.entries()];
  }, [results]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // إعادة المؤشر لأول نتيجة مع كل تغيير في نص البحث
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ابحث عن مطور، مشروع، مهمة، عملية مالية…"
          className={cn(
            'h-9 w-full rounded-lg border border-border bg-surface-2 pr-9 pl-16 text-sm text-text',
            'placeholder:text-faint transition-colors hover:border-border-strong',
            'focus:border-accent focus:outline-none',
          )}
          aria-label="بحث عالمي"
        />
        <kbd className="pointer-events-none absolute top-1/2 left-3 hidden -translate-y-1/2 rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] text-faint sm:block">
          Ctrl K
        </kbd>
      </div>

      {open && query.trim().length > 0 ? (
        <div className="animate-[var(--animate-scale-in)] absolute top-11 right-0 left-0 z-50 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl shadow-black/40">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-faint">
              لا توجد نتائج مطابقة لـ «{query}»
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="border-b border-border/60 py-1.5 last:border-0">
                <p className="px-3 py-1 text-[10px] font-semibold text-faint">{group}</p>
                {items.map(({ result, index }) => {
                  const Icon = RESULT_ICONS[result.icon] ?? Search;
                  return (
                    <button
                      key={result.id}
                      onClick={() => go(result.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-right transition-colors',
                        index === activeIndex ? 'bg-accent-soft' : 'hover:bg-surface-2',
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-text">
                          {result.title}
                        </span>
                        <span className="block truncate text-[11px] text-faint">
                          {result.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
