'use client';

/** الصفحة الرئيسية — ملخص شامل لحالة الاستوديو في لمحة واحدة. */

import {
  Activity as ActivityIcon,
  AlertTriangle,
  Bell,
  Building2,
  Clock,
  Code2,
  FolderKanban,
  ListChecks,
  Pencil,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { PROJECT_STATUS } from '@/core/domain/defaults';
import {
  buildNotifications,
  dashboardStats,
  financeSummary,
  monthlyTrend,
} from '@/core/services/selectors';
import {
  cn,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRelative,
} from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { BarChart } from '@/components/ui/charts';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Progress,
  StatCard,
} from '@/components/ui/primitives';

const ACTION_LABEL = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  import: 'استيراد',
  export: 'تصدير',
  login: 'دخول',
} as const;

const ACTION_STYLE = {
  create: 'bg-emerald-500/15 text-emerald-400',
  update: 'bg-sky-500/15 text-sky-400',
  delete: 'bg-rose-500/15 text-rose-400',
  import: 'bg-violet-500/15 text-violet-400',
  export: 'bg-amber-500/15 text-amber-400',
  login: 'bg-slate-500/15 text-slate-300',
} as const;

export default function DashboardPage() {
  const { data, currentMember } = useStore();
  const currency = data.settings.currency;

  const stats = useMemo(() => dashboardStats(data), [data]);
  const finance = useMemo(
    () =>
      financeSummary(
        data.transactions,
        data.members,
        data.payments,
        data.bonuses,
        data.penalties,
      ),
    [data],
  );
  const trend = useMemo(() => monthlyTrend(data.transactions), [data.transactions]);
  const notifications = useMemo(() => buildNotifications(data), [data]);

  // آخر العمليات مرتّبة من الأحدث للأقدم
  const recentActivity = useMemo(
    () => [...data.activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [data.activity],
  );

  const lastEditor = recentActivity[0];

  // المشاريع النشطة مرتّبة حسب قرب موعد التسليم
  const activeProjects = useMemo(
    () =>
      data.projects
        .filter((project) => project.status !== 'released' && project.status !== 'cancelled')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [data.projects],
  );

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      {/* الترحيب */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
            أهلاً {currentMember?.name?.split(' ')[0] ?? 'بك'}
          </h1>
          <p className="mt-1 text-sm text-muted">هذه نظرة سريعة على حالة الاستوديو اليوم.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <ActivityIcon className="size-4 text-accent" />
          <span className="text-xs text-muted">
            {formatNumber(stats.activityToday)} عملية اليوم
          </span>
        </div>
      </div>

      {/* المؤشرات الرئيسية */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="الإدارات"
          value={formatNumber(stats.departments)}
          icon={Building2}
          href="/departments"
        />
        <StatCard
          label="الموظفون"
          value={formatNumber(stats.members)}
          icon={Users}
          href="/members"
        />
        <StatCard
          label="المطورون"
          value={formatNumber(stats.developers)}
          icon={Code2}
          href="/developers"
        />
        <StatCard
          label="المشاريع"
          value={formatNumber(stats.projects)}
          hint={`${formatNumber(stats.activeProjects)} نشط الآن`}
          icon={FolderKanban}
          href="/projects"
        />
        <StatCard
          label="المهام المفتوحة"
          value={formatNumber(stats.openTasks)}
          icon={ListChecks}
          tone="warning"
          href="/tasks"
        />
        <StatCard
          label="المهام المتأخرة"
          value={formatNumber(stats.overdueTasks)}
          hint={stats.overdueTasks > 0 ? 'تحتاج متابعة عاجلة' : 'لا يوجد تأخير'}
          icon={AlertTriangle}
          tone={stats.overdueTasks > 0 ? 'danger' : 'success'}
          href="/tasks"
        />
        <StatCard
          label="صافي الربح"
          value={formatMoney(finance.profit, currency)}
          hint={`هامش ${Math.round(finance.margin)}%`}
          icon={finance.profit >= 0 ? TrendingUp : TrendingDown}
          tone={finance.profit >= 0 ? 'success' : 'danger'}
          href="/finance"
        />
        <StatCard
          label="مستحقات غير مدفوعة"
          value={formatMoney(finance.totalOutstanding, currency)}
          icon={Wallet}
          tone={finance.totalOutstanding > 0 ? 'warning' : 'success'}
          href="/finance"
        />
      </section>

      {/* المالية والمشاريع */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="الإيرادات والمصروفات"
            description="آخر 6 أشهر"
            icon={Wallet}
            action={
              <Link
                href="/finance"
                className="text-xs text-accent transition-opacity hover:opacity-75"
              >
                التفاصيل ←
              </Link>
            }
          />
          <div className="p-5">
            <div className="mb-5 grid grid-cols-3 gap-3">
              <SummaryTile
                label="الإيرادات"
                value={formatMoney(finance.income, currency)}
                className="text-emerald-400"
              />
              <SummaryTile
                label="المصروفات"
                value={formatMoney(finance.expenses, currency)}
                className="text-rose-400"
              />
              <SummaryTile
                label="الأرباح"
                value={formatMoney(finance.profit, currency)}
                className={finance.profit >= 0 ? 'text-accent' : 'text-rose-400'}
              />
            </div>
            <BarChart data={trend} />
          </div>
        </Card>

        <Card>
          <CardHeader title="مشاريع قيد العمل" description="الأقرب للتسليم" icon={FolderKanban} />
          <div className="space-y-4 p-5">
            {activeProjects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="لا توجد مشاريع نشطة" />
            ) : (
              activeProjects.map((project) => {
                const status = PROJECT_STATUS[project.status];
                return (
                  <div key={project.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-text">
                        {project.name}
                      </span>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <Progress value={project.progress} />
                    <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
                      <span>{project.progress}%</span>
                      <span>التسليم: {formatDate(project.dueDate)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      {/* النشاط والإشعارات */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="آخر العمليات داخل النظام"
            description={
              lastEditor
                ? `آخر تعديل: ${lastEditor.actorName} — ${formatRelative(lastEditor.createdAt)}`
                : 'لم تُسجَّل أي عملية بعد'
            }
            icon={Pencil}
            action={
              <Link
                href="/activity"
                className="text-xs text-accent transition-opacity hover:opacity-75"
              >
                السجل الكامل ←
              </Link>
            }
          />
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="لا توجد عمليات بعد"
              description="أي إضافة أو تعديل أو حذف ستظهر هنا مباشرة."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <Badge className={ACTION_STYLE[entry.action]}>{ACTION_LABEL[entry.action]}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text">{entry.summary}</p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {entry.actorName} — {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] whitespace-nowrap text-faint">
                    {formatRelative(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="أهم الإشعارات"
            description={`${formatNumber(notifications.length)} إشعار يحتاج انتباهك`}
            icon={Bell}
          />
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="لا توجد إشعارات" description="كل شيء تحت السيطرة." />
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.slice(0, 7).map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.href}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        'mt-1 size-2 shrink-0 rounded-full',
                        notification.level === 'danger' ? 'bg-rose-500' : 'bg-amber-500',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-text">
                        {notification.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                        {notification.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ملخص اليوم */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={Clock} label="مهام أُنجزت اليوم" value={formatNumber(stats.completedToday)} />
        <MiniStat
          icon={ActivityIcon}
          label="عمليات اليوم"
          value={formatNumber(stats.activityToday)}
        />
        <MiniStat
          icon={Wallet}
          label="إجمالي المدفوع للفريق"
          value={formatMoney(finance.totalPaidToMembers, currency)}
        />
        <MiniStat
          icon={Users}
          label="أعضاء نشطون"
          value={formatNumber(data.members.filter((m) => m.status === 'active').length)}
        />
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="text-[10px] text-faint">{label}</p>
      <p className={cn('mt-0.5 truncate text-sm font-bold tabular-nums', className)}>{value}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="card-surface flex items-center gap-3 p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-faint">{label}</p>
        <p className="truncate text-sm font-bold tabular-nums text-text">{value}</p>
      </div>
    </div>
  );
}
