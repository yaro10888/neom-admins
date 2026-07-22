/**
 * النسخ الاحتياطي: تصدير كل بيانات النظام واستيرادها.
 *
 * ملف النسخة الاحتياطية مغلّف بمعلومات النسخة (`format` و`version`) حتى يمكن
 * التحقق منه عند الاستيراد، ودعم ترقية الصيغة مستقبلاً دون كسر الملفات القديمة.
 */

import { DEFAULT_SETTINGS } from '../domain/defaults';
import type { DatabaseSnapshot } from '../domain/types';

const FORMAT = 'roblox-studio-dashboard-backup';
const VERSION = 1;

export interface BackupFile {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  /** إحصاءات سريعة تظهر عند الاستيراد قبل التأكيد. */
  stats: Record<string, number>;
  data: DatabaseSnapshot;
}

/** المجموعات التي يجب أن تكون مصفوفات في أي نسخة صحيحة. */
const COLLECTIONS = [
  'departments',
  'ranks',
  'members',
  'payments',
  'promotions',
  'penalties',
  'bonuses',
  'projects',
  'tasks',
  'transactions',
  'notes',
  'campaigns',
  'activity',
] as const;

/** يبني ملف النسخة الاحتياطية من بيانات النظام. */
export function buildBackup(snapshot: DatabaseSnapshot): BackupFile {
  const stats: Record<string, number> = {};
  COLLECTIONS.forEach((name) => {
    stats[name] = snapshot[name].length;
  });

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    stats,
    data: snapshot,
  };
}

/** يبدأ تنزيل ملف في المتصفح. */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // تحرير الذاكرة بعد بدء التنزيل
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** اسم ملف يتضمن التاريخ حتى لا تتصادم النسخ. */
export function backupFilename(extension: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('-');
  return `studio-backup-${stamp}.${extension}`;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

/**
 * يقرأ ملف نسخة احتياطية ويتحقق من صحته.
 * يرمي `BackupValidationError` برسالة عربية واضحة عند أي خلل،
 * حتى لا يُستبدل النظام ببيانات تالفة.
 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupValidationError('الملف ليس بصيغة JSON صالحة.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupValidationError('محتوى الملف غير صالح.');
  }

  const candidate = parsed as Partial<BackupFile>;

  if (candidate.format !== FORMAT) {
    throw new BackupValidationError(
      'هذا الملف ليس نسخة احتياطية صادرة من هذا النظام.',
    );
  }

  if (typeof candidate.version !== 'number' || candidate.version > VERSION) {
    throw new BackupValidationError(
      'إصدار النسخة الاحتياطية أحدث من إصدار النظام الحالي.',
    );
  }

  const data = candidate.data;
  if (typeof data !== 'object' || data === null) {
    throw new BackupValidationError('الملف لا يحتوي على بيانات.');
  }

  // التأكد من أن كل مجموعة موجودة وأنها مصفوفة
  const missing = COLLECTIONS.filter((name) => !Array.isArray(data[name]));
  if (missing.length > 0) {
    throw new BackupValidationError(
      `الملف ناقص أو تالف — المجموعات التالية غير صحيحة: ${missing.join('، ')}`,
    );
  }

  // دمج الإعدادات مع الافتراضيات لتفادي فقدان أي إعداد جديد
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };

  return {
    format: FORMAT,
    version: candidate.version,
    exportedAt: candidate.exportedAt ?? new Date().toISOString(),
    stats: candidate.stats ?? {},
    data: { ...data, settings } as DatabaseSnapshot,
  };
}

/** أسماء عربية للمجموعات — تُستخدم في واجهة النسخ الاحتياطي والتقرير. */
export const COLLECTION_LABELS: Record<string, string> = {
  departments: 'الإدارات',
  ranks: 'الرتب',
  members: 'الموظفون',
  payments: 'المدفوعات',
  promotions: 'الترقيات',
  penalties: 'العقوبات',
  bonuses: 'المكافآت',
  projects: 'المشاريع',
  tasks: 'المهام',
  transactions: 'العمليات المالية',
  notes: 'الملاحظات',
  campaigns: 'الحملات',
  activity: 'سجل النشاط',
};
