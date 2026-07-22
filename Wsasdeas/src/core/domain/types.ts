/**
 * النماذج الأساسية لبيانات النظام (Domain Models).
 *
 * هذه الملفات لا تعرف شيئاً عن طريقة التخزين (LocalStorage / API / قاعدة بيانات).
 * أي تغيير في مصدر البيانات مستقبلاً لا يتطلب تعديل هذا الملف.
 */

/** الحقول المشتركة بين كل الكيانات المخزنة. */
export interface BaseEntity {
  id: string;
  /** تاريخ الإنشاء بصيغة ISO 8601 */
  createdAt: string;
  /** تاريخ آخر تعديل بصيغة ISO 8601 */
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*                              الصلاحيات والرتب                              */
/* -------------------------------------------------------------------------- */

/** الأقسام التي يمكن التحكم في صلاحياتها. */
export type PermissionResource =
  | 'dashboard'
  | 'departments'
  | 'ranks'
  | 'members'
  | 'developers'
  | 'projects'
  | 'tasks'
  | 'finance'
  | 'notes'
  | 'campaigns'
  | 'activity'
  | 'backup'
  | 'settings'
  /** الحسابات: مشاهدة المستخدمين ومعلوماتهم، وتفعيل الحسابات أو إيقافها. */
  | 'users'
  /** البيانات الرسمية: إرسالها والاطلاع على المرسَل منها. */
  | 'statements';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

/** مفتاح صلاحية واحدة، مثل: `developers.edit` */
export type PermissionKey = `${PermissionResource}.${PermissionAction}`;

/** صلاحية شاملة تمنح كل شيء — تُستخدم للإدارة العليا فقط. */
export const ALL_PERMISSIONS = '*' as const;

export type PermissionGrant = PermissionKey | typeof ALL_PERMISSIONS;

/* -------------------------------------------------------------------------- */
/*                                  الإدارات                                  */
/* -------------------------------------------------------------------------- */

export interface Department extends BaseEntity {
  name: string;
  description: string;
  /** لون التمييز (hex) يُستخدم في الواجهة. */
  color: string;
  /** اسم الأيقونة من مكتبة الأيقونات. */
  icon: string;
  /**
   * الإدارة العليا: تمتلك كل الصلاحيات ولا يمكن حذفها.
   * يوجد منها واحدة فقط في النظام.
   */
  isSupreme: boolean;
}

export interface Rank extends BaseEntity {
  departmentId: string;
  name: string;
  /** ترتيب الرتبة داخل الإدارة (1 = الأعلى). */
  level: number;
  /** الصلاحيات الممنوحة لهذه الرتبة. */
  permissions: PermissionGrant[];
  color: string;
}

/* -------------------------------------------------------------------------- */
/*                                   الأعضاء                                  */
/* -------------------------------------------------------------------------- */

export type MemberStatus = 'active' | 'vacation' | 'suspended';

/** طبيعة الاتفاق المالي مع العضو. */
export type AgreementType = 'monthly' | 'per_project' | 'hourly';

export interface Member extends BaseEntity {
  /**
   * ربط العضو بحساب دخول.
   * `null` يعني موظف مسجَّل يدوياً من الإدارة بلا حساب على الموقع —
   * يمكن متابعة راتبه ومهامه دون أن يدخل النظام إطلاقاً.
   */
  authUserId: string | null;

  name: string;
  age: number | null;
  robloxUsername: string | null;
  discordUsername: string | null;
  email: string | null;

  /** قد تكون فارغة قبل أن تُسند الإدارة رتبةً للحساب الجديد. */
  departmentId: string | null;
  rankId: string | null;

  /** التخصص، مثل: مبرمج، مصمم، بناء خرائط. */
  specialty: string;
  /** تاريخ الانضمام بصيغة YYYY-MM-DD */
  joinDate: string;
  status: MemberStatus;
  agreementType: AgreementType;
  /** الراتب أو قيمة الاتفاق. */
  salary: number;
  notes?: string;
  /** لون الصورة الرمزية المولّد. */
  avatarColor: string;

  /** هل فعّلت الإدارة هذا الحساب؟ قبل التفعيل لا يرى المستخدم شيئاً. */
  isActive: boolean;
  /** حساب محمي (المالك) — لا يمكن إلغاء تفعيله ولا حذفه. */
  isProtected: boolean;
}

/* -------------------------------------------------------------------------- */
/*                            سجلات خاصة بالأعضاء                            */
/* -------------------------------------------------------------------------- */

export type PaymentType = 'salary' | 'bonus' | 'project' | 'other';

/** عملية دفع فعلية تمت لعضو. */
export interface Payment extends BaseEntity {
  memberId: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  type: PaymentType;
  method: string;
  note?: string;
  projectId?: string;
}

/** سجل ترقية من رتبة إلى أخرى. */
export interface Promotion extends BaseEntity {
  memberId: string;
  fromRankId: string | null;
  toRankId: string;
  date: string;
  note?: string;
}

export type PenaltySeverity = 'low' | 'medium' | 'high';

/** عقوبة أو مخالفة مسجلة على عضو. */
export interface Penalty extends BaseEntity {
  memberId: string;
  reason: string;
  severity: PenaltySeverity;
  /** خصم مالي مصاحب للعقوبة (اختياري). */
  amount?: number;
  date: string;
}

/** مكافأة ممنوحة لعضو (قد تُدفع لاحقاً كعملية دفع). */
export interface Bonus extends BaseEntity {
  memberId: string;
  amount: number;
  reason: string;
  date: string;
}

/* -------------------------------------------------------------------------- */
/*                                  المشاريع                                  */
/* -------------------------------------------------------------------------- */

export type ProjectStatus =
  | 'planning'
  | 'in_progress'
  | 'testing'
  | 'released'
  | 'paused'
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project extends BaseEntity {
  name: string;
  description: string;
  status: ProjectStatus;
  /** نسبة الإنجاز 0-100 */
  progress: number;
  priority: Priority;
  startDate: string;
  dueDate: string;
  /** المطورون المسؤولون. */
  memberIds: string[];
  budget: number;
  /** رابط اللعبة على Roblox إن وُجد. */
  gameUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*                                   المهام                                   */
/* -------------------------------------------------------------------------- */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Task extends BaseEntity {
  title: string;
  description: string;
  /** العضو المسؤول عن المهمة. */
  assigneeId: string | null;
  departmentId: string;
  projectId: string | null;
  priority: Priority;
  status: TaskStatus;
  /** نسبة الإنجاز 0-100 */
  progress: number;
  /** YYYY-MM-DD */
  dueDate: string;
  comments: TaskComment[];
}

/* -------------------------------------------------------------------------- */
/*                                   المالية                                  */
/* -------------------------------------------------------------------------- */

export type TransactionType = 'income' | 'expense';

export interface Transaction extends BaseEntity {
  type: TransactionType;
  /** تصنيف العملية، مثل: رواتب، إعلانات، مبيعات Robux. */
  category: string;
  amount: number;
  date: string;
  description: string;
  relatedMemberId?: string;
  relatedProjectId?: string;
}

/* -------------------------------------------------------------------------- */
/*                              الملاحظات الخاصة                              */
/* -------------------------------------------------------------------------- */

/** تصنيف الملاحظة لتلوينها وتصفيتها. */
export type NoteCategory = 'positive' | 'negative' | 'action' | 'neutral';

/**
 * ملاحظة إدارية خاصة عن عضو.
 * كل ملاحظة سطر مستقل، وتُجمّع في الواجهة حسب الشخص.
 */
export interface Note extends BaseEntity {
  memberId: string;
  content: string;
  category: NoteCategory;
  /** كاتب الملاحظة. */
  authorId: string;
  pinned: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                  الدعاية                                   */
/* -------------------------------------------------------------------------- */

export type CampaignStatus = 'planned' | 'running' | 'finished' | 'cancelled';

export interface Campaign extends BaseEntity {
  name: string;
  /** المنصة، مثل: Roblox Ads، تويتر، يوتيوب، تيك توك. */
  platform: string;
  budget: number;
  spent: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  /** نتائج الحملة. */
  impressions: number;
  clicks: number;
  conversions: number;
  notes: string;
}

/* -------------------------------------------------------------------------- */
/*                                 سجل النشاط                                 */
/* -------------------------------------------------------------------------- */

export type ActivityAction = 'create' | 'update' | 'delete' | 'import' | 'export' | 'login';

export interface ActivityLog extends BaseEntity {
  /** معرّف العضو الذي قام بالعملية. */
  actorId: string;
  /** الاسم وقت تنفيذ العملية (يبقى ثابتاً حتى لو تغير الاسم لاحقاً). */
  actorName: string;
  action: ActivityAction;
  resource: PermissionResource;
  entityId: string;
  /** وصف مقروء للعملية، مثل: «تم تعديل راتب محمد». */
  summary: string;
}

/* -------------------------------------------------------------------------- */
/*                              البيانات الرسمية                              */
/* -------------------------------------------------------------------------- */

export interface Statement extends BaseEntity {
  /** رقم البيان التسلسلي — تولّده قاعدة البيانات تلقائياً. */
  number: number;
  title: string;
  body: string;
  /** هل صدر البيان بأمر من رتبة أعلى داخل نفس الإدارة؟ */
  byHigherOrder: boolean;
  /** تفاصيل الأمر (من أصدره) عند الحاجة. */
  higherOrderNote?: string;
  authorId: string | null;
  /** اسم المرسِل وقت الإرسال — يبقى ثابتاً حتى لو تغيّر الاسم لاحقاً. */
  authorName: string;
}

/* -------------------------------------------------------------------------- */
/*                            سجل النسخ الاحتياطية                            */
/* -------------------------------------------------------------------------- */

/** كل صف هنا يُطلق إشعار ديسكورد تلقائياً عبر قاعدة البيانات. */
export interface BackupLog extends BaseEntity {
  actorId: string | null;
  actorName: string;
  discordUsername: string;
  /** صيغة النسخة: JSON أو PDF. */
  format: string;
}

/* -------------------------------------------------------------------------- */
/*                                  الإعدادات                                 */
/* -------------------------------------------------------------------------- */

export type ThemeMode = 'dark' | 'light';

export interface AppSettings {
  studioName: string;
  /** رمز العملة المعروض بجانب المبالغ. */
  currency: string;
  theme: ThemeMode;
  /** لون التمييز الأساسي للواجهة (hex). */
  accentColor: string;
  /** كثافة الواجهة. */
  density: 'comfortable' | 'compact';
  /** تفعيل الأنيميشن في الواجهة. */
  animations: boolean;
}

/* -------------------------------------------------------------------------- */
/*                            الشكل الكامل للبيانات                           */
/* -------------------------------------------------------------------------- */

/**
 * الشكل الكامل لقاعدة البيانات.
 * يُستخدم في النسخ الاحتياطي والاستيراد والتصدير.
 */
export interface DatabaseSnapshot {
  departments: Department[];
  ranks: Rank[];
  members: Member[];
  payments: Payment[];
  promotions: Promotion[];
  penalties: Penalty[];
  bonuses: Bonus[];
  projects: Project[];
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  campaigns: Campaign[];
  activity: ActivityLog[];
  statements: Statement[];
  settings: AppSettings;
  /** معرّف العضو الذي سجّل الدخول حالياً. */
  currentMemberId: string | null;
}

/** أسماء المجموعات القابلة للتخزين (بدون الإعدادات والجلسة). */
export type CollectionName = Exclude<
  keyof DatabaseSnapshot,
  'settings' | 'currentMemberId'
>;
