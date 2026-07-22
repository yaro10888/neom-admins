/**
 * مخططات بسيطة مبنية على SVG خالص.
 * بدون أي مكتبة خارجية — حجم أقل وأداء أسرع وتحكم كامل في الشكل.
 */

import { cn, formatCompact } from '@/core/utils/format';

/* ------------------------- مخطط أعمدة بسلسلتين ------------------------- */

export function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; income: number; expenses: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]));

  return (
    <div className="w-full">
      <div
        className="flex items-end justify-between gap-2 px-1"
        style={{ height }}
        role="img"
        aria-label="مخطط الإيرادات والمصروفات"
      >
        {data.map((point) => (
          <div key={point.label} className="flex h-full flex-1 flex-col justify-end gap-1.5">
            <div className="flex h-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-5 rounded-t-md bg-emerald-500/70 transition-[height] duration-700 ease-out"
                style={{ height: `${(point.income / max) * 100}%` }}
                title={`الإيرادات: ${formatCompact(point.income)}`}
              />
              <div
                className="w-1/2 max-w-5 rounded-t-md bg-rose-500/60 transition-[height] duration-700 ease-out"
                style={{ height: `${(point.expenses / max) * 100}%` }}
                title={`المصروفات: ${formatCompact(point.expenses)}`}
              />
            </div>
            <span className="text-center text-[10px] whitespace-nowrap text-faint">
              {point.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-emerald-500/70" />
          الإيرادات
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-rose-500/60" />
          المصروفات
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ مخطط دائري ------------------------------ */

const DONUT_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#8b5cf6',
  '#f43f5e',
  '#84cc16',
];

export function DonutChart({
  data,
  size = 160,
}: {
  data: { label: string; value: number }[];
  size?: number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return <p className="py-8 text-center text-xs text-faint">لا توجد بيانات لعرضها</p>;
  }

  // إزاحة كل شريحة = مجموع الشرائح التي تسبقها (حساب خالص بدون تعديل متغيرات).
  const offsets = data.map(
    (_, index) =>
      (data.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total) * circumference,
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        role="img"
        aria-label="التوزيع حسب التصنيف"
      >
        {data.map((item, index) => {
          const dash = (item.value / total) * circumference;
          return (
            <circle
              key={item.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offsets[index]}
            >
              <title>{`${item.label}: ${formatCompact(item.value)}`}</title>
            </circle>
          );
        })}
      </svg>

      <ul className="space-y-1.5 text-xs">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            <i
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
            />
            <span className="text-muted">{item.label}</span>
            <span className="mr-auto pr-3 font-medium tabular-nums text-text">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------- أعمدة أفقية مرتّبة --------------------------- */

export function HorizontalBars({
  data,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-faint">لا توجد بيانات لعرضها</p>;
  }

  return (
    <ul className={cn('space-y-3', className)}>
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-muted">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-text">
              {formatCompact(item.value)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? 'var(--accent)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
