'use client';

/** جدول بيانات عام قابل للفرز، بنفس الشكل في كل صفحات النظام. */

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/core/utils/format';

export interface Column<T> {
  /** معرّف فريد للعمود. */
  key: string;
  header: string;
  /** محتوى الخلية. */
  render: (row: T) => ReactNode;
  /** القيمة المستخدمة عند الفرز — وجودها يفعّل الفرز على هذا العمود. */
  sortValue?: (row: T) => string | number;
  className?: string;
  /** إخفاء العمود على الشاشات الصغيرة. */
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  keyOf,
  empty,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  keyOf: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;

    const factor = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * factor;
      }
      return String(left).localeCompare(String(right), 'ar') * factor;
    });
  }, [rows, columns, sortKey, direction]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  }

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-right">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium whitespace-nowrap text-muted',
                  column.hideOnMobile && 'hidden md:table-cell',
                  column.className,
                )}
              >
                {column.sortValue ? (
                  <button
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-text"
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      direction === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={keyOf(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border/60 transition-colors last:border-0',
                onRowClick && 'cursor-pointer hover:bg-surface-2',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm text-text',
                    column.hideOnMobile && 'hidden md:table-cell',
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
