'use client';

/** الإدارة المالية — الإيرادات، المصروفات، الأرباح، الرواتب، والمستحقات. */

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PAYMENT_TYPE } from '@/core/domain/defaults';
import type { Transaction, TransactionType } from '@/core/domain/types';
import {
  financeSummary,
  groupByCategory,
  memberFinance,
  monthlyTrend,
} from '@/core/services/selectors';
import {
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  matchesSearch,
  remainingLabel,
} from '@/core/utils/format';
import { todayIso } from '@/core/utils/id';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { BarChart, DonutChart, HorizontalBars } from '@/components/ui/charts';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Field, FormGrid, Input, SearchInput, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
} from '@/components/ui/primitives';

interface TransactionForm {
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description: string;
  relatedMemberId: string;
  relatedProjectId: string;
}

const BLANK: TransactionForm = {
  type: 'income',
  category: '',
  amount: 0,
  date: todayIso(),
  description: '',
  relatedMemberId: '',
  relatedProjectId: '',
};

export default function FinancePage() {
  return (
    <RequirePermission resource="finance">
      <FinanceContent />
    </RequirePermission>
  );
}

function FinanceContent() {
  const { data, can, createItem, updateItem, removeItem } = useStore();
  const currency = data.settings.currency;

  const [tab, setTab] = useState<'transactions' | 'dues' | 'payments'>('transactions');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>(BLANK);

  const summary = useMemo(
    () =>
      financeSummary(data.transactions, data.members, data.payments, data.bonuses, data.penalties),
    [data],
  );

  const trend = useMemo(() => monthlyTrend(data.transactions), [data.transactions]);
  const incomeByCategory = useMemo(
    () => groupByCategory(data.transactions, 'income'),
    [data.transactions],
  );
  const expensesByCategory = useMemo(
    () => groupByCategory(data.transactions, 'expense'),
    [data.transactions],
  );

  const transactions = useMemo(
    () =>
      data.transactions
        .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
        .filter(
          (transaction) =>
            matchesSearch(transaction.description, search) ||
            matchesSearch(transaction.category, search),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.transactions, typeFilter, search],
  );

  /** ملخص مالي لكل عضو: المستحق، المدفوع، المتبقي. */
  const memberDues = useMemo(
    () =>
      data.members
        .map((member) => ({
          member,
          finance: memberFinance(member, data.payments, data.bonuses, data.penalties),
        }))
        .sort((a, b) => b.finance.remaining - a.finance.remaining),
    [data.members, data.payments, data.bonuses, data.penalties],
  );

  const allPayments = useMemo(
    () => [...data.payments].sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments],
  );

  function openCreate() {
    setForm(BLANK);
    setCreating(true);
  }

  function openEdit(transaction: Transaction) {
    setForm({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
      relatedMemberId: transaction.relatedMemberId ?? '',
      relatedProjectId: transaction.relatedProjectId ?? '',
    });
    setEditing(transaction);
  }

  async function save() {
    if (!form.category.trim() || form.amount <= 0) return;

    const payload = {
      ...form,
      relatedMemberId: form.relatedMemberId || undefined,
      relatedProjectId: form.relatedProjectId || undefined,
    };

    if (editing) {
      await updateItem(
        'transactions',
        editing.id,
        payload,
        `تم تعديل عملية مالية: ${form.description || form.category}`,
      );
      setEditing(null);
    } else {
      await createItem(
        'transactions',
        payload,
        `تم تسجيل ${form.type === 'income' ? 'إيراد' : 'مصروف'} بقيمة ${form.amount}`,
      );
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem(
      'transactions',
      deleting.id,
      `تم حذف عملية مالية: ${deleting.description || deleting.category}`,
    );
    setDeleting(null);
  }

  const transactionColumns: Column<Transaction>[] = [
    {
      key: 'type',
      header: 'النوع',
      sortValue: (row) => row.type,
      render: (row) => (
        <Badge
          className={
            row.type === 'income'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-rose-500/15 text-rose-400'
          }
        >
          {row.type === 'income' ? (
            <ArrowUpRight className="ml-1 size-2.5" />
          ) : (
            <ArrowDownLeft className="ml-1 size-2.5" />
          )}
          {row.type === 'income' ? 'إيراد' : 'مصروف'}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'الوصف',
      sortValue: (row) => row.description,
      render: (row) => (
        <span className="min-w-0">
          <span className="block text-xs text-text">{row.description}</span>
          <span className="block text-[10px] text-faint">{row.category}</span>
        </span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      hideOnMobile: true,
      sortValue: (row) => row.date,
      render: (row) => <span className="text-xs text-muted">{formatDate(row.date)}</span>,
    },
    {
      key: 'amount',
      header: 'المبلغ',
      sortValue: (row) => row.amount,
      render: (row) => (
        <span
          className={cn(
            'text-sm font-semibold tabular-nums whitespace-nowrap',
            row.type === 'income' ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {row.type === 'income' ? '+' : '−'}
          {formatMoney(row.amount, currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-1">
          {can('finance', 'edit') ? (
            <button
              onClick={() => openEdit(row)}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
              aria-label="تعديل"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
          {can('finance', 'delete') ? (
            <button
              onClick={() => setDeleting(row)}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
              aria-label="حذف"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const open = creating || editing !== null;

  const TABS = [
    { key: 'transactions', label: 'العمليات المالية' },
    { key: 'dues', label: 'مستحقات الأعضاء' },
    { key: 'payments', label: 'سجل المدفوعات' },
  ] as const;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الإدارة المالية"
        description="الإيرادات والمصروفات والأرباح ومستحقات كل عضو في مكان واحد."
        action={
          can('finance', 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              عملية مالية
            </Button>
          ) : null
        }
      />

      {/* المؤشرات المالية */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="إجمالي الإيرادات"
          value={formatMoney(summary.income, currency)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="إجمالي المصروفات"
          value={formatMoney(summary.expenses, currency)}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="صافي الربح"
          value={formatMoney(summary.profit, currency)}
          hint={`هامش الربح ${Math.round(summary.margin)}%`}
          icon={Wallet}
          tone={summary.profit >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="مستحقات غير مدفوعة"
          value={formatMoney(summary.totalOutstanding, currency)}
          hint={`المدفوع للفريق ${formatMoney(summary.totalPaidToMembers, currency)}`}
          icon={Users}
          tone={summary.totalOutstanding > 0 ? 'warning' : 'success'}
        />
      </section>

      {/* المخططات */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="الاتجاه الشهري" description="آخر 6 أشهر" icon={TrendingUp} />
          <div className="p-5">
            <BarChart data={trend} height={200} />
          </div>
        </Card>

        <Card>
          <CardHeader title="توزيع الإيرادات" icon={ArrowUpRight} />
          <div className="p-5">
            <DonutChart data={incomeByCategory} />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="أكبر بنود المصروفات" icon={ArrowDownLeft} />
          <div className="p-5">
            <HorizontalBars
              data={expensesByCategory.map((item) => ({ ...item, color: '#f43f5e' }))}
            />
          </div>
        </Card>
      </section>

      {/* التبويبات */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab === item.key ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في العمليات…"
              className="w-full sm:w-64"
            />
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="w-auto"
            >
              <option value="all">الكل</option>
              <option value="income">الإيرادات</option>
              <option value="expense">المصروفات</option>
            </Select>
            <span className="mr-auto text-xs text-faint">
              {formatNumber(transactions.length)} عملية
            </span>
          </div>

          <DataTable
            rows={transactions}
            columns={transactionColumns}
            keyOf={(row) => row.id}
            empty={<EmptyState icon={Wallet} title="لا توجد عمليات مالية" />}
          />
        </Card>
      ) : null}

      {tab === 'dues' ? (
        <Card>
          <CardHeader
            title="مستحقات الأعضاء"
            description="إجمالي ما تم دفعه لكل شخص والمتبقي عليه"
            icon={Users}
          />
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max text-right">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-xs font-medium text-muted">العضو</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">الاتفاق</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">المكافآت</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">الخصومات</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">إجمالي المستحق</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">المدفوع</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {memberDues.map(({ member, finance }) => (
                  <tr key={member.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/members/view?id=${member.id}`}
                        className="flex items-center gap-2.5 hover:text-accent"
                      >
                        <Avatar name={member.name} color={member.avatarColor} size="sm" />
                        <span className="text-xs font-medium text-text">{member.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted">
                      {formatMoney(finance.agreed, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-emerald-400">
                      {formatMoney(finance.bonuses, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-rose-400">
                      {formatMoney(finance.penalties, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium tabular-nums text-text">
                      {formatMoney(finance.totalDue, currency)}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-sky-400">
                      {formatMoney(finance.paid, currency)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-xs font-semibold tabular-nums',
                        finance.remaining > 0 ? 'text-amber-400' : 'text-emerald-400',
                      )}
                    >
                      {remainingLabel(finance.remaining, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'payments' ? (
        <Card>
          <CardHeader
            title="سجل كل المدفوعات"
            description={`${formatNumber(allPayments.length)} عملية دفع للفريق`}
            icon={Banknote}
          />
          {allPayments.length === 0 ? (
            <EmptyState icon={Banknote} title="لا توجد مدفوعات مسجلة" />
          ) : (
            <ul className="divide-y divide-border/60">
              {allPayments.map((payment) => {
                const member = data.members.find((item) => item.id === payment.memberId);
                return (
                  <li key={payment.id} className="flex items-center gap-3 px-5 py-3">
                    {member ? (
                      <Avatar name={member.name} color={member.avatarColor} size="sm" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text">
                        {member?.name ?? 'عضو محذوف'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-faint">
                        {formatDate(payment.date)} — {payment.method}
                        {payment.note ? ` — ${payment.note}` : ''}
                      </p>
                    </div>
                    <Badge className={PAYMENT_TYPE[payment.type].className}>
                      {PAYMENT_TYPE[payment.type].label}
                    </Badge>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                      {formatMoney(payment.amount, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {/* نموذج العملية المالية */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'تعديل العملية المالية' : 'تسجيل عملية مالية'}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={!form.category.trim() || form.amount <= 0}
            >
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="النوع">
              <Select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as TransactionType })
                }
              >
                <option value="income">إيراد</option>
                <option value="expense">مصروف</option>
              </Select>
            </Field>

            <Field label="التصنيف" required hint="مثال: أرباح Robux، رواتب، إعلانات">
              <Input
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                list="finance-categories"
              />
              <datalist id="finance-categories">
                {[...new Set(data.transactions.map((t) => t.category))].map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>

            <Field label="المبلغ" required>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label="التاريخ">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </Field>

            <Field label="مرتبطة بعضو">
              <Select
                value={form.relatedMemberId}
                onChange={(event) => setForm({ ...form, relatedMemberId: event.target.value })}
              >
                <option value="">بدون</option>
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="مرتبطة بمشروع">
              <Select
                value={form.relatedProjectId}
                onChange={(event) => setForm({ ...form, relatedProjectId: event.target.value })}
              >
                <option value="">بدون</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          <Field label="الوصف">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="تفاصيل العملية"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف العملية المالية"
        message="سيتم حذف هذه العملية نهائياً وستتغير الحسابات الإجمالية تبعاً لذلك."
      />
    </div>
  );
}
