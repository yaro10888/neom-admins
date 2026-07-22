'use client';

/**
 * الصفحة الكاملة لعضو واحد: بياناته، ماليته، مهامه، وكل سجلاته.
 *
 * تُفتح بـ ‎/members/view?id=xxx‎ — استُخدم مُعامل استعلام بدل مسار ديناميكي
 * حتى يعمل التصدير الثابت المرفوع على Cloudflare (الأعضاء يُنشأون وقت
 * التشغيل فلا يمكن توليد صفحاتهم مسبقاً).
 */

import {
  ArrowRight,
  Award,
  Banknote,
  CalendarDays,
  FolderKanban,
  Gavel,
  ListChecks,
  Plus,
  StickyNote,
  TrendingUp,
  UserX,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import {
  AGREEMENT_TYPE,
  MEMBER_STATUS,
  NOTE_CATEGORY,
  PAYMENT_TYPE,
  PENALTY_SEVERITY,
  PRIORITY,
  TASK_STATUS,
} from '@/core/domain/defaults';
import type { PaymentType, PenaltySeverity } from '@/core/domain/types';
import { memberCompletionRate, memberFinance } from '@/core/services/selectors';
import { cn, formatDate, formatMoney, formatNumber, remainingLabel } from '@/core/utils/format';
import { todayIso } from '@/core/utils/id';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Progress,
  Skeleton,
} from '@/components/ui/primitives';

type RecordKind = 'payment' | 'bonus' | 'penalty' | 'promotion';

export default function MemberDetailPage() {
  return (
    <RequirePermission resource="members">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MemberDetail />
      </Suspense>
    </RequirePermission>
  );
}

function MemberDetail() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';

  const { data, can, createItem } = useStore();
  const currency = data.settings.currency;

  const member = data.members.find((item) => item.id === id);
  const [adding, setAdding] = useState<RecordKind | null>(null);

  // حقول النموذج المشتركة بين أنواع السجلات
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('salary');
  const [method, setMethod] = useState('تحويل بنكي');
  const [severity, setSeverity] = useState<PenaltySeverity>('low');
  const [toRankId, setToRankId] = useState('');

  const finance = useMemo(
    () => (member ? memberFinance(member, data.payments, data.bonuses, data.penalties) : null),
    [member, data.payments, data.bonuses, data.penalties],
  );

  const payments = useMemo(
    () =>
      data.payments
        .filter((payment) => payment.memberId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.payments, id],
  );

  const promotions = useMemo(
    () =>
      data.promotions
        .filter((promotion) => promotion.memberId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.promotions, id],
  );

  const penalties = useMemo(
    () =>
      data.penalties
        .filter((penalty) => penalty.memberId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.penalties, id],
  );

  const bonuses = useMemo(
    () =>
      data.bonuses
        .filter((bonus) => bonus.memberId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.bonuses, id],
  );

  const tasks = useMemo(() => data.tasks.filter((task) => task.assigneeId === id), [data.tasks, id]);

  const projects = useMemo(
    () => data.projects.filter((project) => project.memberIds.includes(id)),
    [data.projects, id],
  );

  const notes = useMemo(() => data.notes.filter((item) => item.memberId === id), [data.notes, id]);

  if (!member) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="العضو غير موجود"
          description="ربما حُذف هذا العضو أو أن الرابط غير صحيح."
          action={
            <Link href="/members">
              <Button size="sm" variant="secondary">
                العودة لقائمة الموظفين
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const department = data.departments.find((item) => item.id === member.departmentId);
  const rank = data.ranks.find((item) => item.id === member.rankId);
  const completion = memberCompletionRate(member.id, data.tasks);

  function openAdd(kind: RecordKind) {
    setAmount(0);
    setDate(todayIso());
    setNote('');
    setPaymentType('salary');
    setMethod('تحويل بنكي');
    setSeverity('low');
    setToRankId(data.ranks.find((r) => r.departmentId === member!.departmentId)?.id ?? '');
    setAdding(kind);
  }

  async function saveRecord() {
    if (!member) return;

    switch (adding) {
      case 'payment':
        if (amount <= 0) return;
        await createItem(
          'payments',
          { memberId: member.id, amount, date, type: paymentType, method, note },
          `تم تسجيل دفعة بقيمة ${amount} لـ ${member.name}`,
        );
        break;

      case 'bonus':
        if (amount <= 0) return;
        await createItem(
          'bonuses',
          { memberId: member.id, amount, reason: note, date },
          `تمت إضافة مكافأة بقيمة ${amount} لـ ${member.name}`,
        );
        break;

      case 'penalty':
        if (!note.trim()) return;
        await createItem(
          'penalties',
          { memberId: member.id, reason: note, severity, amount: amount || undefined, date },
          `تم تسجيل عقوبة على ${member.name}`,
        );
        break;

      case 'promotion':
        if (!toRankId) return;
        await createItem(
          'promotions',
          { memberId: member.id, fromRankId: member.rankId, toRankId, date, note },
          `تمت ترقية ${member.name}`,
        );
        break;

      default:
        break;
    }

    setAdding(null);
  }

  const canEditFinance = can('finance', 'create');
  const canEditMember = can('members', 'edit');

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
      >
        <ArrowRight className="size-3.5" />
        العودة لقائمة الموظفين
      </Link>

      {/* بطاقة التعريف */}
      <Card className="card-gradient p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={member.name} color={member.avatarColor} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text">{member.name}</h1>
              <Badge className={MEMBER_STATUS[member.status].className}>
                {MEMBER_STATUS[member.status].label}
              </Badge>
              {department?.isSupreme ? (
                <Badge className="bg-accent-soft text-accent">الإدارة العليا</Badge>
              ) : null}
              {member.authUserId === null ? (
                <Badge className="bg-slate-500/15 text-slate-300">بلا حساب دخول</Badge>
              ) : !member.isActive ? (
                <Badge className="bg-amber-500/15 text-amber-400">حساب موقوف</Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-muted">{member.specialty || 'بلا تخصص محدد'}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: department?.color ?? '#666' }}
                />
                {department?.name ?? 'بلا إدارة'}
              </span>
              <span>الرتبة: {rank?.name ?? 'بلا رتبة'}</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                انضم في {formatDate(member.joinDate)}
              </span>
              {member.robloxUsername ? <span>Roblox: {member.robloxUsername}</span> : null}
              {member.discordUsername ? <span>ديسكورد: {member.discordUsername}</span> : null}
            </div>
          </div>

          <div className="w-full sm:w-48">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted">نسبة إنجاز المهام</span>
              <span className="font-medium text-text">{completion}%</span>
            </div>
            <Progress value={completion} />
            <p className="mt-1.5 text-[10px] text-faint">
              {formatNumber(tasks.length)} مهمة مسندة
            </p>
          </div>
        </div>

        {member.notes ? (
          <p className="mt-5 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            {member.notes}
          </p>
        ) : null}
      </Card>

      {/* الملخص المالي */}
      {finance ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <FinanceTile
            label={AGREEMENT_TYPE[member.agreementType].label}
            value={formatMoney(finance.agreed, currency)}
          />
          <FinanceTile
            label="المكافآت"
            value={formatMoney(finance.bonuses, currency)}
            className="text-emerald-400"
          />
          <FinanceTile
            label="الخصومات"
            value={formatMoney(finance.penalties, currency)}
            className="text-rose-400"
          />
          <FinanceTile label="إجمالي المستحق" value={formatMoney(finance.totalDue, currency)} />
          <FinanceTile
            label="المدفوع"
            value={formatMoney(finance.paid, currency)}
            className="text-sky-400"
          />
          <FinanceTile
            label="المتبقي"
            value={remainingLabel(finance.remaining, currency)}
            className={finance.remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}
          />
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* سجل المدفوعات */}
        <Card>
          <CardHeader
            title="سجل المدفوعات"
            description={`${formatNumber(payments.length)} عملية دفع`}
            icon={Banknote}
            action={
              canEditFinance ? (
                <Button size="sm" onClick={() => openAdd('payment')}>
                  <Plus className="size-3.5" />
                  دفعة
                </Button>
              ) : null
            }
          />
          {payments.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد مدفوعات مسجلة" />
          ) : (
            <ul className="divide-y divide-border/60">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge className={PAYMENT_TYPE[payment.type].className}>
                    {PAYMENT_TYPE[payment.type].label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text">{payment.note || payment.method}</p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {formatDate(payment.date)} — {payment.method}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                    {formatMoney(payment.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* سجل المكافآت */}
        <Card>
          <CardHeader
            title="سجل المكافآت"
            description={`${formatNumber(bonuses.length)} مكافأة`}
            icon={Award}
            action={
              canEditMember ? (
                <Button size="sm" onClick={() => openAdd('bonus')}>
                  <Plus className="size-3.5" />
                  مكافأة
                </Button>
              ) : null
            }
          />
          {bonuses.length === 0 ? (
            <EmptyState icon={Award} title="لا توجد مكافآت" />
          ) : (
            <ul className="divide-y divide-border/60">
              {bonuses.map((bonus) => (
                <li key={bonus.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text">{bonus.reason}</p>
                    <p className="mt-0.5 text-[10px] text-faint">{formatDate(bonus.date)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                    {formatMoney(bonus.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* سجل الترقيات */}
        <Card>
          <CardHeader
            title="سجل الترقيات"
            description={`${formatNumber(promotions.length)} ترقية`}
            icon={TrendingUp}
            action={
              canEditMember ? (
                <Button size="sm" onClick={() => openAdd('promotion')}>
                  <Plus className="size-3.5" />
                  ترقية
                </Button>
              ) : null
            }
          />
          {promotions.length === 0 ? (
            <EmptyState icon={TrendingUp} title="لا توجد ترقيات" />
          ) : (
            <ul className="divide-y divide-border/60">
              {promotions.map((promotion) => {
                const from = data.ranks.find((r) => r.id === promotion.fromRankId);
                const to = data.ranks.find((r) => r.id === promotion.toRankId);
                return (
                  <li key={promotion.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted">{from?.name ?? 'بداية'}</span>
                      <ArrowRight className="size-3 rotate-180 text-faint" />
                      <span className="font-medium text-text">{to?.name ?? '—'}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-faint">
                      {formatDate(promotion.date)}
                      {promotion.note ? ` — ${promotion.note}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* سجل العقوبات */}
        <Card>
          <CardHeader
            title="سجل العقوبات"
            description={`${formatNumber(penalties.length)} عقوبة`}
            icon={Gavel}
            action={
              canEditMember ? (
                <Button size="sm" onClick={() => openAdd('penalty')}>
                  <Plus className="size-3.5" />
                  عقوبة
                </Button>
              ) : null
            }
          />
          {penalties.length === 0 ? (
            <EmptyState icon={Gavel} title="لا توجد عقوبات — سجل نظيف" />
          ) : (
            <ul className="divide-y divide-border/60">
              {penalties.map((penalty) => (
                <li key={penalty.id} className="flex items-start gap-3 px-5 py-3">
                  <Badge className={PENALTY_SEVERITY[penalty.severity].className}>
                    {PENALTY_SEVERITY[penalty.severity].label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text">{penalty.reason}</p>
                    <p className="mt-0.5 text-[10px] text-faint">{formatDate(penalty.date)}</p>
                  </div>
                  {penalty.amount ? (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-400">
                      −{formatMoney(penalty.amount, currency)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* المهام الحالية */}
        <Card>
          <CardHeader
            title="المهام الحالية"
            description={`${formatNumber(tasks.filter((t) => t.status !== 'done').length)} مهمة مفتوحة`}
            icon={ListChecks}
          />
          {tasks.length === 0 ? (
            <EmptyState icon={ListChecks} title="لا توجد مهام مسندة" />
          ) : (
            <ul className="divide-y divide-border/60">
              {tasks.map((task) => (
                <li key={task.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-text">{task.title}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge className={PRIORITY[task.priority].className}>
                        {PRIORITY[task.priority].label}
                      </Badge>
                      <Badge className={TASK_STATUS[task.status].className}>
                        {TASK_STATUS[task.status].label}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <Progress value={task.progress} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* المشاريع والملاحظات */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="المشاريع"
              description={`${formatNumber(projects.length)} مشروع`}
              icon={FolderKanban}
            />
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="لا يعمل على أي مشروع حالياً" />
            ) : (
              <ul className="divide-y divide-border/60">
                {projects.map((project) => (
                  <li key={project.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-text">{project.name}</span>
                      <span className="shrink-0 text-[10px] text-faint">{project.progress}%</span>
                    </div>
                    <div className="mt-1.5">
                      <Progress value={project.progress} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {can('notes', 'view') ? (
            <Card>
              <CardHeader
                title="الملاحظات الخاصة"
                description={`${formatNumber(notes.length)} ملاحظة`}
                icon={StickyNote}
                action={
                  <Link
                    href="/notes"
                    className="text-xs text-accent transition-opacity hover:opacity-75"
                  >
                    الكل ←
                  </Link>
                }
              />
              {notes.length === 0 ? (
                <EmptyState icon={StickyNote} title="لا توجد ملاحظات" />
              ) : (
                <ul className="divide-y divide-border/60">
                  {notes.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 px-5 py-3">
                      <span
                        className={cn(
                          'mt-1 size-2 shrink-0 rounded-full',
                          item.category === 'positive'
                            ? 'bg-emerald-500'
                            : item.category === 'negative'
                              ? 'bg-rose-500'
                              : item.category === 'action'
                                ? 'bg-amber-500'
                                : 'bg-slate-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs leading-relaxed text-text">{item.content}</p>
                        <p className="mt-0.5 text-[10px] text-faint">
                          {NOTE_CATEGORY[item.category].label} — {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      {/* نموذج إضافة سجل */}
      <Modal
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={
          adding === 'payment'
            ? 'تسجيل عملية دفع'
            : adding === 'bonus'
              ? 'إضافة مكافأة'
              : adding === 'penalty'
                ? 'تسجيل عقوبة'
                : 'ترقية العضو'
        }
        description={`للعضو: ${member.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(null)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={saveRecord}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {adding === 'promotion' ? (
            <Field label="الرتبة الجديدة" required>
              <Select value={toRankId} onChange={(event) => setToRankId(event.target.value)}>
                {data.ranks.map((rankOption) => {
                  const rankDepartment = data.departments.find(
                    (d) => d.id === rankOption.departmentId,
                  );
                  return (
                    <option key={rankOption.id} value={rankOption.id}>
                      {rankOption.name} — {rankDepartment?.name}
                    </option>
                  );
                })}
              </Select>
            </Field>
          ) : null}

          <FormGrid>
            {adding !== 'promotion' ? (
              <Field
                label="المبلغ"
                required={adding !== 'penalty'}
                hint={adding === 'penalty' ? 'اتركه صفراً إن لم يكن هناك خصم' : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value) || 0)}
                />
              </Field>
            ) : null}

            <Field label="التاريخ">
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>

            {adding === 'payment' ? (
              <>
                <Field label="نوع الدفعة">
                  <Select
                    value={paymentType}
                    onChange={(event) => setPaymentType(event.target.value as PaymentType)}
                  >
                    {Object.entries(PAYMENT_TYPE).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="طريقة الدفع">
                  <Input
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    placeholder="تحويل بنكي / PayPal"
                  />
                </Field>
              </>
            ) : null}

            {adding === 'penalty' ? (
              <Field label="الشدّة">
                <Select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as PenaltySeverity)}
                >
                  {Object.entries(PENALTY_SEVERITY).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </FormGrid>

          <Field
            label={
              adding === 'penalty' ? 'سبب العقوبة' : adding === 'bonus' ? 'سبب المكافأة' : 'ملاحظة'
            }
            required={adding === 'penalty'}
          >
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function FinanceTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="card-surface p-3.5">
      <p className="text-[10px] text-faint">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-bold tabular-nums text-text', className)}>
        {value}
      </p>
    </div>
  );
}
