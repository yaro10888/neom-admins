/** دوال التنسيق والعرض المشتركة. */

/** يدمج فئات Tailwind ويتجاهل القيم الفارغة. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const numberFormatter = new Intl.NumberFormat('ar-SA', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('ar-SA', {
  maximumFractionDigits: 1,
});

/** يُنسّق رقماً بفواصل الآلاف. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return numberFormatter.format(Math.round(value));
}

/** يُنسّق مبلغاً مالياً مع رمز العملة. */
export function formatMoney(value: number, currency = 'ر.س'): string {
  const sign = value < 0 ? '−' : '';
  return `${sign}${numberFormatter.format(Math.abs(Math.round(value)))} ${currency}`;
}

/** يختصر الأرقام الكبيرة: 1.2 مليون / 38.5 ألف. */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${decimalFormatter.format(value / 1_000_000)} مليون`;
  if (Math.abs(value) >= 1_000) return `${decimalFormatter.format(value / 1_000)} ألف`;
  return formatNumber(value);
}

/** يُنسّق نسبة مئوية. */
export function formatPercent(value: number): string {
  return `${decimalFormatter.format(value)}%`;
}

const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ar-SA', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** تاريخ مقروء: ١٢ يناير ٢٠٢٦ */
export function formatDate(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

/** تاريخ ووقت مختصر. */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

/** وقت نسبي: «قبل ٣ ساعات». */
export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${formatNumber(minutes)} دقيقة`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${formatNumber(hours)} ساعة`;

  const days = Math.round(hours / 24);
  if (days < 30) return `قبل ${formatNumber(days)} يوم`;

  const months = Math.round(days / 30);
  if (months < 12) return `قبل ${formatNumber(months)} شهر`;

  return `قبل ${formatNumber(Math.round(months / 12))} سنة`;
}

/**
 * عدد الأيام بين اليوم وتاريخ معيّن.
 * سالب = التاريخ في الماضي (متأخر).
 */
export function daysUntil(value: string): number {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * حرفا الصورة الرمزية.
 * تُحذف أداة التعريف «ال» من اسم العائلة حتى لا تظهر كل الأسماء بحرف «ا».
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);

  const second = parts[1].startsWith('ال') && parts[1].length > 2 ? parts[1].slice(2) : parts[1];
  return parts[0][0] + (second[0] ?? '');
}

/**
 * عرض المبلغ المتبقي لعضو.
 * القيمة السالبة تعني أن ما دُفع له تجاوز مستحقاته، فنوضّح ذلك بدل عرض رقم سالب غامض.
 */
export function remainingLabel(value: number, currency: string): string {
  if (value < 0) return `مدفوع بالزيادة ${formatMoney(Math.abs(value), currency)}`;
  return formatMoney(value, currency);
}

/**
 * تطبيع النص العربي للبحث:
 * توحيد الألف والهاء/التاء المربوطة والياء، وحذف التشكيل،
 * حتى يجد البحث «احمد» عند كتابة «أحمد».
 */
export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '') // التشكيل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

/** هل يحتوي النص على كلمة البحث (مع تطبيع عربي)؟ */
export function matchesSearch(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return normalizeArabic(haystack).includes(normalizeArabic(needle));
}
