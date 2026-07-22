/**
 * دوال حسابية خالصة (Pure Selectors) تشتق المعلومات من البيانات الخام.
 *
 * لا تحتوي على أي حالة أو تأثيرات جانبية، وبالتالي يسهل اختبارها وإعادة
 * استخدامها في أي صفحة، وتبقى منطق العمل خارج مكوّنات الواجهة.
 */

import type {
  Bonus,
  Campaign,
  DatabaseSnapshot,
  Department,
  Member,
  Payment,
  Penalty,
  Project,
  Rank,
  Task,
  Transaction,
} from '../domain/types';
import { daysUntil, formatMoney } from '../utils/format';

/* -------------------------------------------------------------------------- */
/*                              الحسابات المالية                              */
/* -------------------------------------------------------------------------- */

/** الملخص المالي لعضو واحد. */
export interface MemberFinance {
  /** الراتب أو قيمة الاتفاق المسجلة. */
  agreed: number;
  /** مجموع المكافآت الممنوحة. */
  bonuses: number;
  /** مجموع الخصومات من العقوبات. */
  penalties: number;
  /** إجمالي المستحق = الاتفاق + المكافآت − العقوبات. */
  totalDue: number;
  /** مجموع ما تم دفعه فعلياً. */
  paid: number;
  /** المتبقي غير المدفوع (لا يقل عن صفر في العرض). */
  remaining: number;
}

export function memberFinance(
  member: Member,
  payments: Payment[],
  bonuses: Bonus[],
  penalties: Penalty[],
): MemberFinance {
  const paid = payments
    .filter((p) => p.memberId === member.id)
    .reduce((sum, p) => sum + p.amount, 0);

  const bonusTotal = bonuses
    .filter((b) => b.memberId === member.id)
    .reduce((sum, b) => sum + b.amount, 0);

  const penaltyTotal = penalties
    .filter((p) => p.memberId === member.id)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const totalDue = member.salary + bonusTotal - penaltyTotal;

  return {
    agreed: member.salary,
    bonuses: bonusTotal,
    penalties: penaltyTotal,
    totalDue,
    paid,
    remaining: totalDue - paid,
  };
}

/** الملخص المالي العام للاستوديو. */
export interface FinanceSummary {
  income: number;
  expenses: number;
  profit: number;
  /** إجمالي ما دُفع للأعضاء. */
  totalPaidToMembers: number;
  /** إجمالي المستحقات غير المدفوعة. */
  totalOutstanding: number;
  /** الهامش الربحي كنسبة مئوية. */
  margin: number;
}

export function financeSummary(
  transactions: Transaction[],
  members: Member[],
  payments: Payment[],
  bonuses: Bonus[],
  penalties: Penalty[],
): FinanceSummary {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaidToMembers = payments.reduce((sum, p) => sum + p.amount, 0);

  const totalOutstanding = members.reduce((sum, member) => {
    const finance = memberFinance(member, payments, bonuses, penalties);
    return sum + Math.max(0, finance.remaining);
  }, 0);

  const profit = income - expenses;

  return {
    income,
    expenses,
    profit,
    totalPaidToMembers,
    totalOutstanding,
    margin: income > 0 ? (profit / income) * 100 : 0,
  };
}

/** يجمّع العمليات المالية حسب التصنيف — يُستخدم في المخططات. */
export function groupByCategory(
  transactions: Transaction[],
  type: Transaction['type'],
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** الإيرادات والمصروفات لآخر 6 أشهر — لمخطط الاتجاه. */
export function monthlyTrend(
  transactions: Transaction[],
  months = 6,
): { label: string; income: number; expenses: number }[] {
  const buckets: { key: string; label: string; income: number; expenses: number }[] = [];
  const formatter = new Intl.DateTimeFormat('ar-SA', { month: 'short' });

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatter.format(date),
      income: 0,
      expenses: 0,
    });
  }

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (!bucket) return;
    if (transaction.type === 'income') bucket.income += transaction.amount;
    else bucket.expenses += transaction.amount;
  });

  return buckets.map(({ label, income, expenses }) => ({ label, income, expenses }));
}

/* -------------------------------------------------------------------------- */
/*                                 المهام                                     */
/* -------------------------------------------------------------------------- */

/** هل المهمة متأخرة؟ (تجاوزت موعد التسليم ولم تكتمل) */
export function isTaskOverdue(task: Task): boolean {
  return task.status !== 'done' && daysUntil(task.dueDate) < 0;
}

/** المهام المفتوحة = كل ما لم يكتمل. */
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status !== 'done');
}

export function overdueTasks(tasks: Task[]): Task[] {
  return tasks.filter(isTaskOverdue);
}

/** نسبة إنجاز المهام لعضو معيّن. */
export function memberCompletionRate(memberId: string, tasks: Task[]): number {
  const assigned = tasks.filter((task) => task.assigneeId === memberId);
  if (assigned.length === 0) return 0;
  const total = assigned.reduce((sum, task) => sum + task.progress, 0);
  return Math.round(total / assigned.length);
}

/* -------------------------------------------------------------------------- */
/*                             إحصائيات الرئيسية                              */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  departments: number;
  members: number;
  developers: number;
  projects: number;
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  completedToday: number;
  activityToday: number;
}

export function dashboardStats(snapshot: DatabaseSnapshot): DashboardStats {
  const devDepartmentIds = snapshot.departments
    .filter((d) => d.name.includes('مطور') || d.icon === 'code')
    .map((d) => d.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  return {
    departments: snapshot.departments.length,
    members: snapshot.members.length,
    developers: snapshot.members.filter(
      (m) => m.departmentId !== null && devDepartmentIds.includes(m.departmentId),
    ).length,
    projects: snapshot.projects.length,
    activeProjects: snapshot.projects.filter(
      (p) => p.status === 'in_progress' || p.status === 'testing',
    ).length,
    openTasks: openTasks(snapshot.tasks).length,
    overdueTasks: overdueTasks(snapshot.tasks).length,
    completedToday: snapshot.tasks.filter(
      (t) => t.status === 'done' && new Date(t.updatedAt).getTime() >= startMs,
    ).length,
    activityToday: snapshot.activity.filter(
      (a) => new Date(a.createdAt).getTime() >= startMs,
    ).length,
  };
}

/** معرّفات الإدارات التي تُعتبر «إدارة مطورين». */
export function developerDepartmentIds(departments: Department[]): string[] {
  return departments.filter((d) => d.name.includes('مطور') || d.icon === 'code').map((d) => d.id);
}

/* -------------------------------------------------------------------------- */
/*                                 الإشعارات                                  */
/* -------------------------------------------------------------------------- */

export type NotificationLevel = 'danger' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  level: NotificationLevel;
  title: string;
  description: string;
  href: string;
}

/**
 * الإشعارات مشتقّة من البيانات وليست مخزّنة — بهذا تبقى دائماً صحيحة
 * ولا تحتاج مزامنة عند تغيّر المهام أو المشاريع.
 */
export function buildNotifications(snapshot: DatabaseSnapshot): AppNotification[] {
  const notifications: AppNotification[] = [];

  // المهام المتأخرة
  overdueTasks(snapshot.tasks).forEach((task) => {
    const late = Math.abs(daysUntil(task.dueDate));
    notifications.push({
      id: `task-late-${task.id}`,
      level: 'danger',
      title: 'مهمة متأخرة',
      description: `«${task.title}» تأخرت ${late} يوم عن موعد التسليم.`,
      href: '/tasks',
    });
  });

  // المشاريع القريبة من التسليم
  snapshot.projects
    .filter((project) => {
      if (project.status === 'released' || project.status === 'cancelled') return false;
      const remaining = daysUntil(project.dueDate);
      return remaining >= 0 && remaining <= 7;
    })
    .forEach((project) => {
      notifications.push({
        id: `project-due-${project.id}`,
        level: 'warning',
        title: 'موعد تسليم قريب',
        description: `«${project.name}» يُسلّم خلال ${daysUntil(project.dueDate)} يوم.`,
        href: `/projects`,
      });
    });

  // المشاريع المتأخرة
  snapshot.projects
    .filter(
      (project) =>
        project.status !== 'released' &&
        project.status !== 'cancelled' &&
        daysUntil(project.dueDate) < 0,
    )
    .forEach((project) => {
      notifications.push({
        id: `project-late-${project.id}`,
        level: 'danger',
        title: 'مشروع تجاوز موعده',
        description: `«${project.name}» تجاوز موعد التسليم بـ ${Math.abs(daysUntil(project.dueDate))} يوم.`,
        href: `/projects`,
      });
    });

  // المستحقات غير المدفوعة
  snapshot.members.forEach((member) => {
    const finance = memberFinance(
      member,
      snapshot.payments,
      snapshot.bonuses,
      snapshot.penalties,
    );
    if (finance.remaining > 0) {
      notifications.push({
        id: `payment-due-${member.id}`,
        level: 'warning',
        title: 'مستحقات غير مدفوعة',
        description: `${member.name} — مبلغ متبقٍ قدره ${formatMoney(
          finance.remaining,
          snapshot.settings.currency,
        )}.`,
        href: `/members/view?id=${member.id}`,
      });
    }
  });

  // الحملات التي تجاوزت الميزانية
  snapshot.campaigns
    .filter((campaign) => campaign.spent > campaign.budget)
    .forEach((campaign) => {
      notifications.push({
        id: `campaign-over-${campaign.id}`,
        level: 'danger',
        title: 'تجاوز ميزانية حملة',
        description: `«${campaign.name}» تجاوزت الميزانية المحددة.`,
        href: '/campaigns',
      });
    });

  const order: Record<NotificationLevel, number> = { danger: 0, warning: 1, info: 2 };
  return notifications.sort((a, b) => order[a.level] - order[b.level]);
}

/* -------------------------------------------------------------------------- */
/*                              مساعدات الربط                                 */
/* -------------------------------------------------------------------------- */

export function findDepartment(
  departments: Department[],
  id: string | undefined,
): Department | undefined {
  return departments.find((d) => d.id === id);
}

export function findRank(ranks: Rank[], id: string | undefined): Rank | undefined {
  return ranks.find((r) => r.id === id);
}

export function findMember(members: Member[], id: string | null | undefined): Member | undefined {
  if (!id) return undefined;
  return members.find((m) => m.id === id);
}

export function findProject(
  projects: Project[],
  id: string | null | undefined,
): Project | undefined {
  if (!id) return undefined;
  return projects.find((p) => p.id === id);
}

/** نسبة استهلاك ميزانية حملة. */
export function campaignSpendRate(campaign: Campaign): number {
  if (campaign.budget <= 0) return 0;
  return Math.min(100, (campaign.spent / campaign.budget) * 100);
}
