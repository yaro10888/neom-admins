/**
 * تعريف قائمة التنقّل.
 *
 * كل عنصر مرتبط بقسم صلاحيات — الشريط الجانبي يخفي تلقائياً أي عنصر
 * لا يملك المستخدم صلاحية عرضه، فلا حاجة لأي شرط داخل الواجهة.
 */

import {
  Activity,
  Building2,
  Code2,
  DatabaseBackup,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Send,
  Settings,
  Shield,
  StickyNote,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { PermissionAction, PermissionResource } from '@/core/domain/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  resource: PermissionResource;
  /**
   * الصلاحية المطلوبة لإظهار العنصر — الافتراضي `view`.
   * تُستخدم مثلاً لإخفاء «إرسال بيان» عمّن يملك العرض فقط.
   */
  action?: PermissionAction;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'نظرة عامة',
    items: [
      { href: '/', label: 'الرئيسية', icon: LayoutDashboard, resource: 'dashboard' },
      { href: '/activity', label: 'سجل النشاط', icon: Activity, resource: 'activity' },
    ],
  },
  {
    title: 'الهيكل التنظيمي',
    items: [
      { href: '/departments', label: 'الإدارات', icon: Building2, resource: 'departments' },
      { href: '/ranks', label: 'الرتب والصلاحيات', icon: Shield, resource: 'ranks' },
      { href: '/members', label: 'الموظفون', icon: Users, resource: 'members' },
      { href: '/developers', label: 'المطورون', icon: Code2, resource: 'developers' },
    ],
  },
  {
    title: 'العمل',
    items: [
      { href: '/projects', label: 'المشاريع', icon: FolderKanban, resource: 'projects' },
      { href: '/tasks', label: 'المهام', icon: ListChecks, resource: 'tasks' },
      { href: '/campaigns', label: 'الدعاية', icon: Megaphone, resource: 'campaigns' },
    ],
  },
  {
    title: 'البيانات الرسمية',
    items: [
      // إرسال بيان يتطلب صلاحية «إضافة»، فمن لا يملكها لا يرى الزر أصلاً
      { href: '/statements/new', label: 'إرسال بيان', icon: Send, resource: 'statements', action: 'create' },
      { href: '/statements', label: 'البيان المرسل', icon: FileText, resource: 'statements' },
    ],
  },
  {
    title: 'الإدارة',
    items: [
      { href: '/finance', label: 'المالية', icon: Wallet, resource: 'finance' },
      { href: '/notes', label: 'الملاحظات الخاصة', icon: StickyNote, resource: 'notes' },
      { href: '/users', label: 'الحسابات', icon: UserCog, resource: 'users' },
      { href: '/backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup, resource: 'backup' },
      { href: '/settings', label: 'الإعدادات', icon: Settings, resource: 'settings' },
    ],
  },
];

/** أيقونات الإدارات — تُختار عند إنشاء إدارة جديدة. */
export const DEPARTMENT_ICON_MAP: Record<string, LucideIcon> = {
  crown: Shield,
  code: Code2,
  wallet: Wallet,
  megaphone: Megaphone,
  users: Users,
  'shield-check': Shield,
  headphones: Activity,
  palette: StickyNote,
  gamepad: FolderKanban,
  briefcase: Building2,
};

export function departmentIcon(name: string): LucideIcon {
  return DEPARTMENT_ICON_MAP[name] ?? Building2;
}
