/** المكوّنات الأساسية المعاد استخدامها في كل صفحات اللوحة. */

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { cn, initials } from '@/core/utils/format';

/* ---------------------------------- بطاقة --------------------------------- */

export function Card({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('card-surface', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ElementType;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon className="size-4.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------- زر ----------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-sm shadow-black/20',
  secondary:
    'bg-surface-2 text-text border border-border hover:bg-surface-3 hover:border-border-strong',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25',
  subtle: 'bg-accent-soft text-accent hover:brightness-110',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* --------------------------------- شارة ---------------------------------- */

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        className ?? 'bg-surface-3 text-muted',
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- صورة رمزية ------------------------------- */

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'size-7 text-[10px]',
    md: 'size-9 text-xs',
    lg: 'size-14 text-lg',
  } as const;

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-white select-none',
        sizes[size],
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------- شريط تقدّم ------------------------------- */

export function Progress({
  value,
  className,
  color,
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: color ?? 'var(--accent)' }}
      />
    </div>
  );
}

/* ------------------------------- حالة فارغة ------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-faint">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- هيكل تحميل ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

/* ------------------------------- عنوان صفحة ------------------------------- */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted text-balance">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ بطاقة إحصائية ----------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ElementType;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  href?: string;
}) {
  const tones = {
    default: 'text-accent bg-accent-soft',
    success: 'text-emerald-400 bg-emerald-500/12',
    warning: 'text-amber-400 bg-amber-500/12',
    danger: 'text-rose-400 bg-rose-500/12',
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className={cn('grid size-9 place-items-center rounded-lg', tones[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-text">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-faint">{hint}</p> : null}
    </>
  );

  const className = cn(
    'card-surface card-gradient block p-4 transition-all duration-200',
    href && 'hover:border-border-strong hover:-translate-y-0.5',
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
