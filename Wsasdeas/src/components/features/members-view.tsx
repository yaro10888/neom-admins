'use client';

/**
 * عرض قائمة الأعضاء.
 *
 * تُستخدم في صفحتي «الموظفون» و«المطورون» — الفرق بينهما مجرد تصفية
 * على الإدارات، فلا حاجة لتكرار الكود.
 */

import { Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AGREEMENT_TYPE, AVATAR_COLORS, MEMBER_STATUS } from '@/core/domain/defaults';
import type { AgreementType, Member, MemberStatus, PermissionResource } from '@/core/domain/types';
import { memberCompletionRate, memberFinance } from '@/core/services/selectors';
import { formatMoney, formatNumber, matchesSearch, remainingLabel } from '@/core/utils/format';
import { todayIso } from '@/core/utils/id';
import { useStore } from '@/providers/store-provider';
import { Field, FormGrid, Input, SearchInput, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Progress,
} from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/ui/data-table';

interface MemberForm {
  name: string;
  departmentId: string;
  rankId: string;
  specialty: string;
  joinDate: string;
  status: MemberStatus;
  agreementType: AgreementType;
  salary: number;
  robloxUsername: string;
  discordUsername: string;
  email: string;
  notes: string;
  avatarColor: string;
}

export function MembersView({
  resource,
  title,
  description,
  departmentFilter,
}: {
  /** القسم المستخدم للتحقق من الصلاحيات. */
  resource: PermissionResource;
  title: string;
  description: string;
  /** إن حُدِّدت، تُعرض فقط الأعضاء المنتمون لهذه الإدارات. */
  departmentFilter?: string[];
}) {
  const { data, can, createItem, updateItem, removeItem } = useStore();
  const currency = data.settings.currency;

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('all');
  const [status, setStatus] = useState('all');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(blankForm(data.departments[0]?.id ?? ''));

  /** الإدارات المتاحة في مربع التصفية. */
  const departments = useMemo(
    () =>
      departmentFilter
        ? data.departments.filter((d) => departmentFilter.includes(d.id))
        : data.departments,
    [data.departments, departmentFilter],
  );

  const rows = useMemo(() => {
    return data.members
      .filter(
        (member) =>
          !departmentFilter ||
          (member.departmentId !== null && departmentFilter.includes(member.departmentId)),
      )
      .filter((member) => departmentId === 'all' || member.departmentId === departmentId)
      .filter((member) => status === 'all' || member.status === status)
      .filter(
        (member) =>
          matchesSearch(member.name, search) ||
          matchesSearch(member.specialty, search) ||
          matchesSearch(member.robloxUsername ?? '', search),
      );
  }, [data.members, departmentFilter, departmentId, status, search]);

  /** الرتب المتاحة للإدارة المختارة في النموذج. */
  const formRanks = useMemo(
    () => data.ranks.filter((rank) => rank.departmentId === form.departmentId),
    [data.ranks, form.departmentId],
  );

  function openCreate() {
    const firstDepartment = departments[0]?.id ?? data.departments[0]?.id ?? '';
    setForm(blankForm(firstDepartment, data.ranks.find((r) => r.departmentId === firstDepartment)?.id));
    setCreating(true);
  }

  function openEdit(member: Member) {
    setForm({
      name: member.name,
      departmentId: member.departmentId ?? '',
      rankId: member.rankId ?? '',
      specialty: member.specialty,
      joinDate: member.joinDate,
      status: member.status,
      agreementType: member.agreementType,
      salary: member.salary,
      robloxUsername: member.robloxUsername ?? '',
      discordUsername: member.discordUsername ?? '',
      email: member.email ?? '',
      notes: member.notes ?? '',
      avatarColor: member.avatarColor,
    });
    setEditing(member);
  }

  async function save() {
    if (!form.name.trim() || !form.departmentId) return;

    // التأكد من أن الرتبة تنتمي فعلاً للإدارة المختارة
    const rankId = formRanks.find((rank) => rank.id === form.rankId)?.id ?? formRanks[0]?.id ?? null;

    const payload = {
      ...form,
      rankId,
      departmentId: form.departmentId || null,
      robloxUsername: form.robloxUsername.trim() || null,
      discordUsername: form.discordUsername.trim() || null,
      email: form.email.trim() || null,
    };

    if (editing) {
      await updateItem('members', editing.id, payload, `تم تعديل بيانات ${form.name}`);
      setEditing(null);
    } else {
      // موظف يضيفه المسؤول يدوياً: بلا حساب دخول، ومفعّل مباشرة كسجل عمل
      await createItem(
        'members',
        { ...payload, authUserId: null, age: null, isActive: true, isProtected: false },
        `تمت إضافة عضو جديد: ${form.name}`,
      );
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('members', deleting.id, `تم حذف العضو ${deleting.name}`);
    setDeleting(null);
  }

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'العضو',
      sortValue: (member) => member.name,
      render: (member) => (
        <Link
          href={`/members/view?id=${member.id}`}
          className="flex items-center gap-2.5 group/link"
        >
          <Avatar name={member.name} color={member.avatarColor} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-text group-hover/link:text-accent">
              {member.name}
            </span>
            <span className="block truncate text-[10px] text-faint">{member.specialty}</span>
          </span>
        </Link>
      ),
    },
    {
      key: 'department',
      header: 'الإدارة',
      hideOnMobile: true,
      sortValue: (member) =>
        data.departments.find((d) => d.id === member.departmentId)?.name ?? '',
      render: (member) => {
        const department = data.departments.find((d) => d.id === member.departmentId);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: department?.color ?? '#666' }}
            />
            {department?.name ?? '—'}
          </span>
        );
      },
    },
    {
      key: 'rank',
      header: 'الرتبة',
      hideOnMobile: true,
      sortValue: (member) => data.ranks.find((r) => r.id === member.rankId)?.level ?? 99,
      render: (member) => (
        <span className="text-xs text-muted">
          {data.ranks.find((r) => r.id === member.rankId)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      sortValue: (member) => member.status,
      render: (member) => (
        <Badge className={MEMBER_STATUS[member.status].className}>
          {MEMBER_STATUS[member.status].label}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'إنجاز المهام',
      hideOnMobile: true,
      sortValue: (member) => memberCompletionRate(member.id, data.tasks),
      render: (member) => {
        const rate = memberCompletionRate(member.id, data.tasks);
        return (
          <div className="w-24">
            <Progress value={rate} />
            <span className="mt-1 block text-[10px] text-faint">{rate}%</span>
          </div>
        );
      },
    },
    {
      key: 'salary',
      header: 'الاتفاق',
      hideOnMobile: true,
      sortValue: (member) => member.salary,
      render: (member) => (
        <span className="text-xs whitespace-nowrap text-muted tabular-nums">
          {formatMoney(member.salary, currency)}
          <span className="mr-1 text-[10px] text-faint">
            {AGREEMENT_TYPE[member.agreementType].label}
          </span>
        </span>
      ),
    },
    {
      key: 'remaining',
      header: 'المتبقي',
      sortValue: (member) =>
        memberFinance(member, data.payments, data.bonuses, data.penalties).remaining,
      render: (member) => {
        const finance = memberFinance(member, data.payments, data.bonuses, data.penalties);
        return (
          <span
            className={`text-xs font-medium tabular-nums whitespace-nowrap ${
              finance.remaining > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {remainingLabel(finance.remaining, currency)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (member) => (
        <div className="flex items-center gap-1">
          {can(resource, 'edit') ? (
            <button
              onClick={() => openEdit(member)}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
              aria-label={`تعديل ${member.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
          {can(resource, 'delete') ? (
            <button
              onClick={() => setDeleting(member)}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
              aria-label={`حذف ${member.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          can(resource, 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              إضافة عضو
            </Button>
          ) : null
        }
      />

      <Card>
        {/* أدوات التصفية */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو التخصص…"
            className="w-full sm:w-64"
          />

          <Select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="w-auto"
          >
            <option value="all">كل الإدارات</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-auto"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(MEMBER_STATUS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>

          <span className="mr-auto text-xs text-faint">
            {formatNumber(rows.length)} من {formatNumber(data.members.length)}
          </span>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          keyOf={(member) => member.id}
          empty={
            <EmptyState
              icon={Users}
              title="لا يوجد أعضاء مطابقون"
              description="جرّب تغيير كلمة البحث أو التصفية."
              action={
                can(resource, 'create') ? (
                  <Button size="sm" onClick={openCreate}>
                    <UserPlus className="size-3.5" />
                    إضافة عضو
                  </Button>
                ) : null
              }
            />
          }
        />
      </Card>

      {/* نموذج العضو */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل بيانات ${editing.name}` : 'إضافة عضو جديد'}
        size="lg"
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
            <Button variant="primary" onClick={save} disabled={!form.name.trim()}>
              {editing ? 'حفظ التعديلات' : 'إضافة العضو'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="الاسم الكامل" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="مثال: محمد العتيبي"
              />
            </Field>

            <Field label="التخصص">
              <Input
                value={form.specialty}
                onChange={(event) => setForm({ ...form, specialty: event.target.value })}
                placeholder="مثال: برمجة Lua"
              />
            </Field>

            <Field label="الإدارة" required>
              <Select
                value={form.departmentId}
                onChange={(event) => {
                  const nextDepartment = event.target.value;
                  const firstRank = data.ranks.find((r) => r.departmentId === nextDepartment);
                  setForm({
                    ...form,
                    departmentId: nextDepartment,
                    rankId: firstRank?.id ?? '',
                  });
                }}
              >
                {data.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الرتبة" hint="تحدد صلاحيات العضو داخل النظام">
              <Select
                value={form.rankId}
                onChange={(event) => setForm({ ...form, rankId: event.target.value })}
              >
                {formRanks.length === 0 ? (
                  <option value="">لا توجد رتب في هذه الإدارة</option>
                ) : (
                  formRanks.map((rank) => (
                    <option key={rank.id} value={rank.id}>
                      {rank.name}
                    </option>
                  ))
                )}
              </Select>
            </Field>

            <Field label="تاريخ الانضمام">
              <Input
                type="date"
                value={form.joinDate}
                onChange={(event) => setForm({ ...form, joinDate: event.target.value })}
              />
            </Field>

            <Field label="الحالة">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as MemberStatus })
                }
              >
                {Object.entries(MEMBER_STATUS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="نوع الاتفاق">
              <Select
                value={form.agreementType}
                onChange={(event) =>
                  setForm({ ...form, agreementType: event.target.value as AgreementType })
                }
              >
                {Object.entries(AGREEMENT_TYPE).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الراتب / قيمة الاتفاق">
              <Input
                type="number"
                min={0}
                value={form.salary}
                onChange={(event) => setForm({ ...form, salary: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label="حساب Roblox">
              <Input
                value={form.robloxUsername}
                onChange={(event) => setForm({ ...form, robloxUsername: event.target.value })}
                placeholder="اسم المستخدم"
              />
            </Field>

            <Field label="ديسكورد">
              <Input
                value={form.discordUsername}
                onChange={(event) => setForm({ ...form, discordUsername: event.target.value })}
                placeholder="username"
              />
            </Field>
          </FormGrid>

          <Field label="ملاحظات عامة">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="أي معلومات إضافية عن العضو"
            />
          </Field>

          <Field label="لون الصورة الرمزية">
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, avatarColor: color })}
                  className={`size-8 rounded-full transition-transform hover:scale-110 ${
                    form.avatarColor === color
                      ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-surface'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`اختيار اللون ${color}`}
                />
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف العضو"
        message={`سيتم حذف ${deleting?.name} مع كل مدفوعاته وترقياته وعقوباته ومكافآته وملاحظاته. مهامه ومشاريعه ستبقى لكن بدون مسؤول.`}
      />
    </div>
  );
}

function blankForm(departmentId: string, rankId?: string): MemberForm {
  return {
    name: '',
    departmentId,
    rankId: rankId ?? '',
    specialty: '',
    joinDate: todayIso(),
    status: 'active',
    agreementType: 'monthly',
    salary: 0,
    robloxUsername: '',
    discordUsername: '',
    email: '',
    notes: '',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };
}
