'use client';

/**
 * الرتب والصلاحيات.
 *
 * لوحة الصلاحيات تُبنى تلقائياً من قائمة الأقسام والإجراءات، فأي قسم جديد
 * يُضاف للنظام يظهر هنا فوراً بدون تعديل هذه الصفحة.
 */

import { Crown, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ACTIONS, RESOURCES, permissionLabel } from '@/core/domain/permissions';
import {
  ALL_PERMISSIONS,
  type PermissionAction,
  type PermissionGrant,
  type PermissionKey,
  type PermissionResource,
  type Rank,
} from '@/core/domain/types';
import { cn, formatNumber } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, Input, Select } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives';

interface RankForm {
  name: string;
  departmentId: string;
  level: number;
  color: string;
  permissions: PermissionGrant[];
}

export default function RanksPage() {
  return (
    <RequirePermission resource="ranks">
      <RanksContent />
    </RequirePermission>
  );
}

function RanksContent() {
  const { data, can, createItem, updateItem, removeItem } = useStore();

  const [editing, setEditing] = useState<Rank | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Rank | null>(null);
  const [form, setForm] = useState<RankForm>({
    name: '',
    departmentId: '',
    level: 1,
    color: '#6366f1',
    permissions: [],
  });

  const memberCounts = useMemo(() => {
    const map = new Map<string, number>();
    data.members.forEach((member) => {
      // الحسابات الجديدة قد تكون بلا رتبة حتى تُسندها الإدارة
      if (!member.rankId) return;
      map.set(member.rankId, (map.get(member.rankId) ?? 0) + 1);
    });
    return map;
  }, [data.members]);

  function openCreate(departmentId: string) {
    setForm({
      name: '',
      departmentId,
      level: (data.ranks.filter((r) => r.departmentId === departmentId).length || 0) + 1,
      color: '#6366f1',
      permissions: ['dashboard.view'],
    });
    setCreating(true);
  }

  function openEdit(rank: Rank) {
    setForm({
      name: rank.name,
      departmentId: rank.departmentId,
      level: rank.level,
      color: rank.color,
      permissions: [...rank.permissions],
    });
    setEditing(rank);
  }

  async function save() {
    if (!form.name.trim() || !form.departmentId) return;

    if (editing) {
      await updateItem('ranks', editing.id, { ...form }, `تم تعديل صلاحيات رتبة «${form.name}»`);
      setEditing(null);
    } else {
      await createItem('ranks', { ...form }, `تم إنشاء رتبة جديدة «${form.name}»`);
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('ranks', deleting.id, `تم حذف رتبة «${deleting.name}»`);
    setDeleting(null);
  }

  /** تبديل صلاحية واحدة في النموذج. */
  function togglePermission(resource: PermissionResource, action: PermissionAction) {
    const key = `${resource}.${action}` as PermissionKey;
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((permission) => permission !== key)
        : [...current.permissions, key],
    }));
  }

  /** تبديل كل صلاحيات قسم واحد دفعة واحدة. */
  function toggleResourceRow(resource: PermissionResource) {
    const keys = ACTIONS.map((action) => `${resource}.${action.key}` as PermissionKey);
    const allSelected = keys.every((key) => form.permissions.includes(key));
    setForm((current) => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter((permission) => !keys.includes(permission as PermissionKey))
        : [...new Set([...current.permissions, ...keys])],
    }));
  }

  const hasAll = form.permissions.includes(ALL_PERMISSIONS);
  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الرتب والصلاحيات"
        description="حدّد بدقة ما تستطيع كل رتبة رؤيته وتعديله. الإدارة العليا تملك كل الصلاحيات تلقائياً."
      />

      {data.departments.map((department) => {
        const ranks = data.ranks
          .filter((rank) => rank.departmentId === department.id)
          .sort((a, b) => a.level - b.level);

        return (
          <Card key={department.id}>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: department.color }}
                />
                <h2 className="text-sm font-semibold text-text">{department.name}</h2>
                {department.isSupreme ? (
                  <Badge className="bg-accent-soft text-accent">
                    <Crown className="ml-1 size-2.5" />
                    كل الصلاحيات
                  </Badge>
                ) : null}
              </div>

              {can('ranks', 'create') ? (
                <Button size="sm" onClick={() => openCreate(department.id)}>
                  <Plus className="size-3.5" />
                  رتبة
                </Button>
              ) : null}
            </div>

            {ranks.length === 0 ? (
              <EmptyState icon={Shield} title="لا توجد رتب في هذه الإدارة" />
            ) : (
              <ul className="divide-y divide-border/60">
                {ranks.map((rank) => {
                  const isAll = rank.permissions.includes(ALL_PERMISSIONS);
                  return (
                    <li
                      key={rank.id}
                      className="group flex flex-wrap items-center gap-3 px-5 py-3.5"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                        style={{ backgroundColor: rank.color }}
                      >
                        {rank.level}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text">{rank.name}</p>
                        <p className="mt-0.5 text-[11px] text-faint">
                          {formatNumber(memberCounts.get(rank.id) ?? 0)} عضو —{' '}
                          {isAll
                            ? 'صلاحيات كاملة على النظام'
                            : `${formatNumber(rank.permissions.length)} صلاحية`}
                        </p>
                      </div>

                      {/* أهم الصلاحيات كمعاينة سريعة */}
                      <div className="hidden flex-wrap items-center gap-1 md:flex">
                        {isAll ? (
                          <Badge className="bg-accent-soft text-accent">كل الصلاحيات</Badge>
                        ) : (
                          <>
                            {rank.permissions.slice(0, 3).map((permission) => (
                              <Badge key={permission}>{permissionLabel(permission)}</Badge>
                            ))}
                            {rank.permissions.length > 3 ? (
                              <Badge>+{formatNumber(rank.permissions.length - 3)}</Badge>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {can('ranks', 'edit') ? (
                          <button
                            onClick={() => openEdit(rank)}
                            className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                            aria-label={`تعديل ${rank.name}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        ) : null}
                        {can('ranks', 'delete') ? (
                          <button
                            onClick={() => setDeleting(rank)}
                            className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                            aria-label={`حذف ${rank.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      })}

      {/* نموذج الرتبة مع لوحة الصلاحيات */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل رتبة «${editing.name}»` : 'إنشاء رتبة جديدة'}
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
              {editing ? 'حفظ التعديلات' : 'إنشاء الرتبة'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormGrid columns={3}>
            <Field label="اسم الرتبة" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="مثال: مطور أول"
              />
            </Field>

            <Field label="الإدارة" required>
              <Select
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
              >
                {data.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="المستوى" hint="1 = الأعلى داخل الإدارة">
              <Input
                type="number"
                min={1}
                value={form.level}
                onChange={(event) =>
                  setForm({ ...form, level: Math.max(1, Number(event.target.value) || 1) })
                }
              />
            </Field>
          </FormGrid>

          {/* منح كل الصلاحيات */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-2 p-3.5 transition-colors hover:border-border-strong">
            <input
              type="checkbox"
              checked={hasAll}
              onChange={(event) =>
                setForm({
                  ...form,
                  permissions: event.target.checked ? [ALL_PERMISSIONS] : ['dashboard.view'],
                })
              }
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-text">
                <Crown className="size-3.5 text-accent" />
                منح كل الصلاحيات (صلاحية الإدارة العليا)
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                تمنح هذه الرتبة وصولاً كاملاً لكل الأقسام الحالية وأي قسم يُضاف مستقبلاً.
              </span>
            </span>
          </label>

          {/* لوحة الصلاحيات التفصيلية */}
          <div className={cn('transition-opacity', hasAll && 'pointer-events-none opacity-40')}>
            <p className="mb-2 text-xs font-medium text-muted">الصلاحيات التفصيلية</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-max text-right">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-4 py-2.5 text-xs font-medium text-muted">القسم</th>
                    {ACTIONS.map((action) => (
                      <th
                        key={action.key}
                        className="px-3 py-2.5 text-center text-xs font-medium text-muted"
                      >
                        {action.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-muted">
                      الكل
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => {
                    const keys = ACTIONS.map(
                      (action) => `${resource.key}.${action.key}` as PermissionKey,
                    );
                    const allSelected = keys.every((key) => form.permissions.includes(key));

                    return (
                      <tr key={resource.key} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2 text-xs text-text">{resource.label}</td>
                        {ACTIONS.map((action) => {
                          const key = `${resource.key}.${action.key}` as PermissionKey;
                          return (
                            <td key={action.key} className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={form.permissions.includes(key)}
                                onChange={() => togglePermission(resource.key, action.key)}
                                className="size-4 cursor-pointer accent-[var(--accent)]"
                                aria-label={`${action.label} ${resource.label}`}
                              />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleResourceRow(resource.key)}
                            className="size-4 cursor-pointer accent-[var(--accent)]"
                            aria-label={`كل صلاحيات ${resource.label}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف الرتبة"
        message={`سيتم حذف رتبة «${deleting?.name}». الأعضاء الذين يحملونها سيفقدون صلاحياتهم حتى تُسند لهم رتبة أخرى.`}
      />
    </div>
  );
}
