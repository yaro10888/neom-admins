'use client';

/**
 * الحسابات والمستخدمون.
 *
 * تعرض كل من أنشأ حساباً على الموقع، مع معلوماته الكاملة، وتتيح للإدارة
 * تفعيل الحساب أو إيقافه، وإسناد الإدارة والرتبة له.
 * حساب المالك محمي: لا يمكن إيقافه ولا تغيير رتبته (المنع مفروض في قاعدة البيانات).
 */

import {
  CheckCircle2,
  Gamepad2,
  MessageSquare,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Member } from '@/core/domain/types';
import { cn, formatDate, formatNumber, matchesSearch } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, SearchInput, Select } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from '@/components/ui/primitives';

export default function UsersPage() {
  return (
    <RequirePermission resource="users">
      <UsersContent />
    </RequirePermission>
  );
}

function UsersContent() {
  const { data, can, updateItem } = useStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [viewing, setViewing] = useState<Member | null>(null);
  const [deactivating, setDeactivating] = useState<Member | null>(null);
  const [assigning, setAssigning] = useState<Member | null>(null);
  const [assignForm, setAssignForm] = useState({ departmentId: '', rankId: '' });
  const [error, setError] = useState<string | null>(null);

  /** الحسابات فقط: من له auth_user_id. الموظفون المضافون يدوياً ليسوا حسابات. */
  const accounts = useMemo(
    () =>
      data.members
        .filter((member) => member.authUserId !== null)
        .filter((member) =>
          filter === 'all'
            ? true
            : filter === 'active'
              ? member.isActive
              : !member.isActive,
        )
        .filter(
          (member) =>
            matchesSearch(member.name, search) ||
            matchesSearch(member.email ?? '', search) ||
            matchesSearch(member.discordUsername ?? '', search) ||
            matchesSearch(member.robloxUsername ?? '', search),
        )
        .sort((a, b) => {
          // غير المفعّلين أولاً لأنهم ينتظرون إجراءً
          if (a.isActive !== b.isActive) return a.isActive ? 1 : -1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [data.members, filter, search],
  );

  const allAccounts = data.members.filter((m) => m.authUserId !== null);
  const pendingCount = allAccounts.filter((m) => !m.isActive).length;

  const canEdit = can('users', 'edit');

  async function setActive(member: Member, next: boolean) {
    setError(null);
    try {
      await updateItem(
        'members',
        member.id,
        { isActive: next },
        next ? `تم تفعيل حساب ${member.name}` : `تم إيقاف حساب ${member.name}`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر تنفيذ العملية.');
    }
    setDeactivating(null);
  }

  function openAssign(member: Member) {
    setAssignForm({
      departmentId: member.departmentId ?? '',
      rankId: member.rankId ?? '',
    });
    setAssigning(member);
  }

  async function saveAssign() {
    if (!assigning) return;
    setError(null);
    try {
      await updateItem(
        'members',
        assigning.id,
        {
          departmentId: assignForm.departmentId || null,
          rankId: assignForm.rankId || null,
        },
        `تم تحديث إدارة ورتبة ${assigning.name}`,
      );
      setAssigning(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر الحفظ.');
    }
  }

  const assignRanks = data.ranks.filter((r) => r.departmentId === assignForm.departmentId);

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الحسابات والمستخدمون"
        description="كل من أنشأ حساباً على الموقع. فعّل الحسابات الجديدة وأسند لها الإدارة والرتبة."
      />

      {error ? (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="إجمالي الحسابات" value={formatNumber(allAccounts.length)} icon={UsersIcon} />
        <StatCard
          label="بانتظار التفعيل"
          value={formatNumber(pendingCount)}
          hint={pendingCount > 0 ? 'تحتاج مراجعتك' : 'لا يوجد'}
          icon={ShieldOff}
          tone={pendingCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="حسابات مفعّلة"
          value={formatNumber(allAccounts.length - pendingCount)}
          icon={ShieldCheck}
          tone="success"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الإيميل أو ديسكورد…"
          className="w-full sm:w-72"
        />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-auto"
        >
          <option value="all">كل الحسابات</option>
          <option value="pending">بانتظار التفعيل</option>
          <option value="active">المفعّلة</option>
        </Select>
        <span className="mr-auto text-xs text-faint">{formatNumber(accounts.length)} حساب</span>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title="لا توجد حسابات مطابقة"
            description="الحسابات تظهر هنا بمجرد أن يسجّل أحد على الموقع."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {accounts.map((account) => {
            const department = data.departments.find((d) => d.id === account.departmentId);
            const rank = data.ranks.find((r) => r.id === account.rankId);

            return (
              <Card
                key={account.id}
                className={cn('p-4', !account.isActive && 'border-amber-500/30')}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={account.name} color={account.avatarColor} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text">{account.name}</span>
                      {account.isProtected ? (
                        <Badge className="bg-accent-soft text-accent">
                          <Shield className="ml-1 size-2.5" />
                          المالك — محمي
                        </Badge>
                      ) : account.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400">مفعّل</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-400">بانتظار التفعيل</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-faint">
                      {account.email} — سجّل في {formatDate(account.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {department?.name ?? 'بلا إدارة'} — {rank?.name ?? 'بلا رتبة'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(account)}>
                      <Search className="size-3.5" />
                      معلوماته
                    </Button>

                    {canEdit && !account.isProtected ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => openAssign(account)}>
                          <UserCog className="size-3.5" />
                          الرتبة
                        </Button>

                        {account.isActive ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeactivating(account)}
                          >
                            <ShieldOff className="size-3.5" />
                            إيقاف
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setActive(account, true)}
                          >
                            <CheckCircle2 className="size-3.5" />
                            تفعيل
                          </Button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* معلومات الحساب */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `معلومات ${viewing.name}` : ''}
        footer={
          viewing ? (
            <Link href={`/members/view?id=${viewing.id}`}>
              <Button variant="secondary">فتح الملف الكامل</Button>
            </Link>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={viewing.name} color={viewing.avatarColor} size="lg" />
              <div>
                <p className="text-base font-semibold text-text">{viewing.name}</p>
                <p className="text-xs text-muted">{viewing.specialty || 'بلا تخصص محدد'}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="الإيميل" value={viewing.email ?? '—'} />
              <InfoRow label="العمر" value={viewing.age ? String(viewing.age) : '—'} />
              <InfoRow
                label="اسم Roblox"
                value={viewing.robloxUsername ?? '—'}
                icon={Gamepad2}
              />
              <InfoRow
                label="اسم ديسكورد"
                value={viewing.discordUsername ?? '—'}
                icon={MessageSquare}
              />
              <InfoRow
                label="الإدارة"
                value={
                  data.departments.find((d) => d.id === viewing.departmentId)?.name ?? 'بلا إدارة'
                }
              />
              <InfoRow
                label="الرتبة"
                value={data.ranks.find((r) => r.id === viewing.rankId)?.name ?? 'بلا رتبة'}
              />
              <InfoRow label="تاريخ التسجيل" value={formatDate(viewing.createdAt)} />
              <InfoRow
                label="حالة الحساب"
                value={viewing.isActive ? 'مفعّل' : 'بانتظار التفعيل'}
              />
            </dl>
          </div>
        ) : null}
      </Modal>

      {/* إسناد الإدارة والرتبة */}
      <Modal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title={assigning ? `رتبة ${assigning.name}` : ''}
        description="تحدد الرتبة ما يستطيع هذا الحساب رؤيته وتعديله."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssigning(null)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={saveAssign}>
              حفظ
            </Button>
          </>
        }
      >
        <FormGrid>
          <Field label="الإدارة">
            <Select
              value={assignForm.departmentId}
              onChange={(e) =>
                setAssignForm({ departmentId: e.target.value, rankId: '' })
              }
            >
              <option value="">بلا إدارة</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="الرتبة">
            <Select
              value={assignForm.rankId}
              onChange={(e) => setAssignForm({ ...assignForm, rankId: e.target.value })}
            >
              <option value="">بلا رتبة</option>
              {assignRanks.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </Modal>

      <ConfirmDialog
        open={deactivating !== null}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => deactivating && setActive(deactivating, false)}
        title="إيقاف الحساب"
        confirmLabel="إيقاف"
        message={`سيفقد ${deactivating?.name} الوصول إلى النظام بالكامل حتى تعيد تفعيله، وستظهر له شاشة انتظار التفعيل.`}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Gamepad2;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[10px] text-faint">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs text-text">{value}</dd>
    </div>
  );
}
