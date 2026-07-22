'use client';

/**
 * تقرير PDF.
 *
 * يُبنى التقرير كصفحة HTML مهيّأة للطباعة، ثم يُحفظ كـ PDF من نافذة الطباعة.
 * اخترنا هذا الأسلوب بدل مكتبات توليد PDF لأن المتصفح وحده هو ما يعرض
 * النص العربي بشكل صحيح (اتصال الحروف واتجاه RTL)، بينما مكتبات PDF
 * تحتاج خطوطاً مضمّنة ومحرك تشكيل ولا تعطي نتيجة سليمة مع العربية.
 */

import { ArrowRight, Printer } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

import {
  CAMPAIGN_STATUS,
  MEMBER_STATUS,
  PROJECT_STATUS,
  TASK_STATUS,
} from '@/core/domain/defaults';
import { financeSummary, memberFinance, dashboardStats } from '@/core/services/selectors';
import { formatDate, formatMoney, formatNumber } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Button } from '@/components/ui/primitives';

export default function ReportPage() {
  return (
    <RequirePermission resource="backup">
      <Report />
    </RequirePermission>
  );
}

function Report() {
  const { data, ready } = useStore();
  const currency = data.settings.currency;

  const stats = useMemo(() => dashboardStats(data), [data]);
  const finance = useMemo(
    () =>
      financeSummary(data.transactions, data.members, data.payments, data.bonuses, data.penalties),
    [data],
  );

  // فتح نافذة الطباعة تلقائياً بعد اكتمال عرض التقرير
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-4">
      {/* شريط الأدوات — لا يظهر في الطباعة */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/backup"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
        >
          <ArrowRight className="size-3.5" />
          العودة للنسخ الاحتياطي
        </Link>

        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="size-4" />
          طباعة / حفظ كـ PDF
        </Button>
      </div>

      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted print:hidden">
        ستُفتح نافذة الطباعة تلقائياً. اختر <strong className="text-text">الوجهة: حفظ كـ PDF</strong>{' '}
        ثم اضغط حفظ لتنزيل التقرير.
      </p>

      {/* ------------------------------- التقرير ------------------------------- */}
      <article className="rounded-xl border border-border bg-white p-8 text-black print:rounded-none print:border-0 print:p-0">
        {/* الترويسة */}
        <header className="border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">{data.settings.studioName}</h1>
          <p className="mt-1 text-sm text-gray-600">تقرير شامل لبيانات النظام</p>
          <p className="mt-2 text-xs text-gray-500">
            تاريخ التقرير: {formatDate(new Date().toISOString())}
          </p>
        </header>

        {/* الملخص التنفيذي */}
        <Section title="الملخص العام">
          <div className="grid grid-cols-4 gap-3">
            <Tile label="الإدارات" value={formatNumber(stats.departments)} />
            <Tile label="الموظفون" value={formatNumber(stats.members)} />
            <Tile label="المطورون" value={formatNumber(stats.developers)} />
            <Tile label="المشاريع" value={formatNumber(stats.projects)} />
            <Tile label="المهام المفتوحة" value={formatNumber(stats.openTasks)} />
            <Tile label="المهام المتأخرة" value={formatNumber(stats.overdueTasks)} />
            <Tile label="الإيرادات" value={formatMoney(finance.income, currency)} />
            <Tile label="المصروفات" value={formatMoney(finance.expenses, currency)} />
            <Tile label="صافي الربح" value={formatMoney(finance.profit, currency)} />
            <Tile label="المدفوع للفريق" value={formatMoney(finance.totalPaidToMembers, currency)} />
            <Tile label="مستحقات متبقية" value={formatMoney(finance.totalOutstanding, currency)} />
            <Tile label="الحملات" value={formatNumber(data.campaigns.length)} />
          </div>
        </Section>

        {/* الإدارات */}
        <Section title="الإدارات">
          <Table headers={['الإدارة', 'الوصف', 'عدد الرتب', 'عدد الأعضاء']}>
            {data.departments.map((department) => (
              <tr key={department.id} className="border-b border-gray-200">
                <Td>
                  {department.name}
                  {department.isSupreme ? ' (عليا)' : ''}
                </Td>
                <Td>{department.description}</Td>
                <Td>{formatNumber(data.ranks.filter((r) => r.departmentId === department.id).length)}</Td>
                <Td>
                  {formatNumber(data.members.filter((m) => m.departmentId === department.id).length)}
                </Td>
              </tr>
            ))}
          </Table>
        </Section>

        {/* الموظفون والمستحقات */}
        <Section title="الموظفون والمستحقات المالية" breakBefore>
          <Table
            headers={[
              'الاسم',
              'الإدارة',
              'الرتبة',
              'الحالة',
              'الاتفاق',
              'المدفوع',
              'المتبقي',
            ]}
          >
            {data.members.map((member) => {
              const memberDues = memberFinance(
                member,
                data.payments,
                data.bonuses,
                data.penalties,
              );
              return (
                <tr key={member.id} className="border-b border-gray-200">
                  <Td>{member.name}</Td>
                  <Td>{data.departments.find((d) => d.id === member.departmentId)?.name ?? '—'}</Td>
                  <Td>{data.ranks.find((r) => r.id === member.rankId)?.name ?? '—'}</Td>
                  <Td>{MEMBER_STATUS[member.status].label}</Td>
                  <Td>{formatMoney(memberDues.agreed, currency)}</Td>
                  <Td>{formatMoney(memberDues.paid, currency)}</Td>
                  <Td>{formatMoney(memberDues.remaining, currency)}</Td>
                </tr>
              );
            })}
          </Table>
        </Section>

        {/* المشاريع */}
        <Section title="المشاريع" breakBefore>
          <Table headers={['المشروع', 'الحالة', 'الإنجاز', 'البداية', 'التسليم', 'الفريق']}>
            {data.projects.map((project) => (
              <tr key={project.id} className="border-b border-gray-200">
                <Td>{project.name}</Td>
                <Td>{PROJECT_STATUS[project.status].label}</Td>
                <Td>{project.progress}%</Td>
                <Td>{formatDate(project.startDate)}</Td>
                <Td>{formatDate(project.dueDate)}</Td>
                <Td>{formatNumber(project.memberIds.length)}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        {/* المهام */}
        <Section title="المهام">
          <Table headers={['المهمة', 'المسؤول', 'الحالة', 'الإنجاز', 'التسليم']}>
            {data.tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-200">
                <Td>{task.title}</Td>
                <Td>{data.members.find((m) => m.id === task.assigneeId)?.name ?? '—'}</Td>
                <Td>{TASK_STATUS[task.status].label}</Td>
                <Td>{task.progress}%</Td>
                <Td>{formatDate(task.dueDate)}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        {/* المالية */}
        <Section title="العمليات المالية" breakBefore>
          <Table headers={['التاريخ', 'النوع', 'التصنيف', 'الوصف', 'المبلغ']}>
            {[...data.transactions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-200">
                  <Td>{formatDate(transaction.date)}</Td>
                  <Td>{transaction.type === 'income' ? 'إيراد' : 'مصروف'}</Td>
                  <Td>{transaction.category}</Td>
                  <Td>{transaction.description}</Td>
                  <Td>{formatMoney(transaction.amount, currency)}</Td>
                </tr>
              ))}
          </Table>
        </Section>

        {/* الحملات */}
        <Section title="الحملات الإعلانية">
          <Table headers={['الحملة', 'المنصة', 'الحالة', 'الميزانية', 'المصروف', 'لاعبون جدد']}>
            {data.campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-b border-gray-200">
                <Td>{campaign.name}</Td>
                <Td>{campaign.platform}</Td>
                <Td>{CAMPAIGN_STATUS[campaign.status].label}</Td>
                <Td>{formatMoney(campaign.budget, currency)}</Td>
                <Td>{formatMoney(campaign.spent, currency)}</Td>
                <Td>{formatNumber(campaign.conversions)}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        {/* الملاحظات */}
        <Section title="الملاحظات الخاصة" breakBefore>
          {data.members
            .filter((member) => data.notes.some((note) => note.memberId === member.id))
            .map((member) => (
              <div key={member.id} className="mb-4">
                <p className="text-sm font-bold">{member.name}</p>
                <ul className="mt-1 mr-5 list-disc space-y-0.5">
                  {data.notes
                    .filter((note) => note.memberId === member.id)
                    .map((note) => (
                      <li key={note.id} className="text-xs text-gray-700">
                        {note.content}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </Section>

        {/* سجل النشاط */}
        <Section title="سجل النشاط (آخر 50 عملية)" breakBefore>
          <Table headers={['الوقت', 'الشخص', 'العملية']}>
            {[...data.activity]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 50)
              .map((entry) => (
                <tr key={entry.id} className="border-b border-gray-200">
                  <Td>{formatDate(entry.createdAt)}</Td>
                  <Td>{entry.actorName}</Td>
                  <Td>{entry.summary}</Td>
                </tr>
              ))}
          </Table>
        </Section>

        <footer className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
          تقرير مولَّد آلياً من نظام إدارة {data.settings.studioName}
        </footer>
      </article>
    </div>
  );
}

/* ------------------------------ عناصر التقرير ------------------------------ */

function Section({
  title,
  children,
  breakBefore,
}: {
  title: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={`mt-6 ${breakBefore ? 'print-break' : ''}`}>
      <h2 className="mb-2 border-r-4 border-gray-800 pr-2 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-300 px-2.5 py-2">
      <p className="text-[10px] text-gray-600">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-right">
      <thead>
        <tr className="border-b-2 border-gray-400 bg-gray-100">
          {headers.map((header) => (
            <th key={header} className="px-2 py-1.5 text-[11px] font-bold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1.5 text-[11px]">{children}</td>;
}
