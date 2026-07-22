'use client';

/** عناصر النماذج الموحّدة — تضمن شكلاً واحداً لكل حقول الإدخال في النظام. */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/core/utils/format';

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text ' +
  'placeholder:text-faint transition-colors duration-150 ' +
  'hover:border-border-strong focus:border-accent focus:outline-none ' +
  'disabled:opacity-50';

/** غلاف حقل مع تسمية ورسالة خطأ اختيارية. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">
        {label}
        {required ? <span className="text-rose-400">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return <input className={cn(FIELD_CLASS, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea className={cn(FIELD_CLASS, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'select'>) {
  return (
    <select className={cn(FIELD_CLASS, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

/** شبكة حقول متجاوبة داخل النماذج. */
export function FormGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const map = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  } as const;
  return <div className={cn('grid gap-4', map[columns])}>{children}</div>;
}

/** مربع اختيار بنمط النظام. */
export function Checkbox({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<'input'> & { label: string }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2',
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
        {...props}
      />
      <span className="text-xs text-text">{label}</span>
    </label>
  );
}

/** حقل بحث مع أيقونة. */
export function SearchInput({
  className,
  ...props
}: ComponentPropsWithoutRef<'input'>) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input className={cn(FIELD_CLASS, 'pr-9')} {...props} />
    </div>
  );
}
