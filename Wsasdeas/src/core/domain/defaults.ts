/** القيم الافتراضية والثوابت المعروضة في الواجهة. */

import type {
  AgreementType,
  AppSettings,
  CampaignStatus,
  MemberStatus,
  NoteCategory,
  PenaltySeverity,
  PaymentType,
  Priority,
  ProjectStatus,
  TaskStatus,
} from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  studioName: 'استوديو تطوير ألعاب Roblox',
  currency: 'ر.س',
  theme: 'dark',
  accentColor: '#6366f1',
  density: 'comfortable',
  animations: true,
};

/** ألوان التمييز الجاهزة في الإعدادات. */
export const ACCENT_PRESETS = [
  { name: 'بنفسجي', value: '#6366f1' },
  { name: 'أزرق', value: '#3b82f6' },
  { name: 'أخضر', value: '#10b981' },
  { name: 'برتقالي', value: '#f59e0b' },
  { name: 'وردي', value: '#ec4899' },
  { name: 'أحمر', value: '#ef4444' },
  { name: 'سماوي', value: '#06b6d4' },
] as const;

/* -------------------------------------------------------------------------- */
/*                        خرائط الحالات والأسماء العربية                       */
/* -------------------------------------------------------------------------- */

/** نوع موحّد لوصف حالة معروضة: اسم عربي + لون. */
export interface StatusMeta {
  label: string;
  /** فئة Tailwind للخلفية والنص. */
  className: string;
}

export const MEMBER_STATUS: Record<MemberStatus, StatusMeta> = {
  active: { label: 'نشط', className: 'bg-emerald-500/15 text-emerald-400' },
  vacation: { label: 'إجازة', className: 'bg-amber-500/15 text-amber-400' },
  suspended: { label: 'متوقف', className: 'bg-rose-500/15 text-rose-400' },
};

export const AGREEMENT_TYPE: Record<AgreementType, StatusMeta> = {
  monthly: { label: 'راتب شهري', className: 'bg-sky-500/15 text-sky-400' },
  per_project: { label: 'حسب المشروع', className: 'bg-violet-500/15 text-violet-400' },
  hourly: { label: 'بالساعة', className: 'bg-teal-500/15 text-teal-400' },
};

export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  planning: { label: 'تخطيط', className: 'bg-slate-500/15 text-slate-300' },
  in_progress: { label: 'قيد التطوير', className: 'bg-sky-500/15 text-sky-400' },
  testing: { label: 'اختبار', className: 'bg-amber-500/15 text-amber-400' },
  released: { label: 'منشور', className: 'bg-emerald-500/15 text-emerald-400' },
  paused: { label: 'متوقف مؤقتاً', className: 'bg-orange-500/15 text-orange-400' },
  cancelled: { label: 'ملغي', className: 'bg-rose-500/15 text-rose-400' },
};

export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  todo: { label: 'لم تبدأ', className: 'bg-slate-500/15 text-slate-300' },
  in_progress: { label: 'قيد التنفيذ', className: 'bg-sky-500/15 text-sky-400' },
  review: { label: 'مراجعة', className: 'bg-violet-500/15 text-violet-400' },
  done: { label: 'مكتملة', className: 'bg-emerald-500/15 text-emerald-400' },
  blocked: { label: 'معطّلة', className: 'bg-rose-500/15 text-rose-400' },
};

export const PRIORITY: Record<Priority, StatusMeta> = {
  low: { label: 'منخفضة', className: 'bg-slate-500/15 text-slate-300' },
  medium: { label: 'متوسطة', className: 'bg-sky-500/15 text-sky-400' },
  high: { label: 'عالية', className: 'bg-amber-500/15 text-amber-400' },
  urgent: { label: 'عاجلة', className: 'bg-rose-500/15 text-rose-400' },
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, StatusMeta> = {
  planned: { label: 'مخططة', className: 'bg-slate-500/15 text-slate-300' },
  running: { label: 'جارية', className: 'bg-emerald-500/15 text-emerald-400' },
  finished: { label: 'منتهية', className: 'bg-sky-500/15 text-sky-400' },
  cancelled: { label: 'ملغاة', className: 'bg-rose-500/15 text-rose-400' },
};

export const NOTE_CATEGORY: Record<NoteCategory, StatusMeta> = {
  positive: { label: 'إيجابية', className: 'bg-emerald-500/15 text-emerald-400' },
  negative: { label: 'سلبية', className: 'bg-rose-500/15 text-rose-400' },
  action: { label: 'تحتاج إجراء', className: 'bg-amber-500/15 text-amber-400' },
  neutral: { label: 'عامة', className: 'bg-slate-500/15 text-slate-300' },
};

export const PENALTY_SEVERITY: Record<PenaltySeverity, StatusMeta> = {
  low: { label: 'بسيطة', className: 'bg-amber-500/15 text-amber-400' },
  medium: { label: 'متوسطة', className: 'bg-orange-500/15 text-orange-400' },
  high: { label: 'شديدة', className: 'bg-rose-500/15 text-rose-400' },
};

export const PAYMENT_TYPE: Record<PaymentType, StatusMeta> = {
  salary: { label: 'راتب', className: 'bg-sky-500/15 text-sky-400' },
  bonus: { label: 'مكافأة', className: 'bg-emerald-500/15 text-emerald-400' },
  project: { label: 'دفعة مشروع', className: 'bg-violet-500/15 text-violet-400' },
  other: { label: 'أخرى', className: 'bg-slate-500/15 text-slate-300' },
};

/** ألوان الصور الرمزية المولّدة للأعضاء. */
export const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

/** الأيقونات المتاحة عند إنشاء إدارة جديدة. */
export const DEPARTMENT_ICONS = [
  'crown',
  'code',
  'wallet',
  'megaphone',
  'users',
  'shield-check',
  'headphones',
  'palette',
  'gamepad',
  'briefcase',
] as const;
