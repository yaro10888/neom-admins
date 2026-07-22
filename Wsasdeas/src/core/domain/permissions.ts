/**
 * نظام الصلاحيات.
 *
 * المبدأ: كل رتبة تحمل قائمة صلاحيات بصيغة `resource.action`.
 * الإدارة العليا تحمل الرمز `*` الذي يمنح كل الصلاحيات تلقائياً،
 * وبالتالي أي قسم جديد يُضاف مستقبلاً يصبح متاحاً لها بدون تعديل أي كود.
 */

import {
  ALL_PERMISSIONS,
  type PermissionAction,
  type PermissionGrant,
  type PermissionKey,
  type PermissionResource,
} from './types';

/** كل الأقسام مع أسمائها العربية، مصدر واحد للحقيقة. */
export const RESOURCES: { key: PermissionResource; label: string }[] = [
  { key: 'dashboard', label: 'الرئيسية' },
  { key: 'departments', label: 'الإدارات' },
  { key: 'ranks', label: 'الرتب' },
  { key: 'members', label: 'الموظفون' },
  { key: 'developers', label: 'المطورون' },
  { key: 'projects', label: 'المشاريع' },
  { key: 'tasks', label: 'المهام' },
  { key: 'finance', label: 'المالية' },
  { key: 'notes', label: 'الملاحظات الخاصة' },
  { key: 'campaigns', label: 'الدعاية' },
  { key: 'activity', label: 'سجل النشاط' },
  { key: 'statements', label: 'البيانات الرسمية' },
  { key: 'users', label: 'الحسابات والمستخدمون' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
  { key: 'settings', label: 'الإعدادات' },
];

export const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'عرض' },
  { key: 'create', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
];

/** قائمة كل مفاتيح الصلاحيات الممكنة — تُبنى تلقائياً من الأقسام والإجراءات. */
export const ALL_PERMISSION_KEYS: PermissionKey[] = RESOURCES.flatMap((resource) =>
  ACTIONS.map((action) => `${resource.key}.${action.key}` as PermissionKey),
);

export function permissionLabel(key: PermissionGrant): string {
  if (key === ALL_PERMISSIONS) return 'كل الصلاحيات';
  const [resource, action] = key.split('.') as [PermissionResource, PermissionAction];
  const resourceLabel = RESOURCES.find((r) => r.key === resource)?.label ?? resource;
  const actionLabel = ACTIONS.find((a) => a.key === action)?.label ?? action;
  return `${actionLabel} — ${resourceLabel}`;
}

/**
 * يتحقق مما إذا كانت مجموعة الصلاحيات تسمح بإجراء معيّن.
 * وجود `*` يعني السماح بكل شيء.
 */
export function hasPermission(
  grants: PermissionGrant[] | undefined,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!grants || grants.length === 0) return false;
  if (grants.includes(ALL_PERMISSIONS)) return true;
  return grants.includes(`${resource}.${action}` as PermissionKey);
}

/** هل يملك المستخدم أي صلاحية على هذا القسم؟ يُستخدم لإظهار عناصر القائمة. */
export function canAccessResource(
  grants: PermissionGrant[] | undefined,
  resource: PermissionResource,
): boolean {
  return hasPermission(grants, resource, 'view');
}

/** يبني مجموعة صلاحيات كاملة (كل الإجراءات) لأقسام محددة. */
export function fullAccessTo(...resources: PermissionResource[]): PermissionKey[] {
  return resources.flatMap((resource) =>
    ACTIONS.map((action) => `${resource}.${action.key}` as PermissionKey),
  );
}

/** يبني صلاحيات عرض فقط لأقسام محددة. */
export function viewOnly(...resources: PermissionResource[]): PermissionKey[] {
  return resources.map((resource) => `${resource}.view` as PermissionKey);
}
