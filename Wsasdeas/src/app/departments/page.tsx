'use client';

/** إدارة الإدارات — إنشاء وتعديل وحذف إدارات جديدة بالكامل من الواجهة. */

import { Building2, Crown, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DEPARTMENT_ICONS } from '@/core/domain/defaults';
import type { Department } from '@/core/domain/types';
import { cn, formatNumber } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { departmentIcon } from '@/components/layout/nav-config';
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives';

/** القيم الافتراضية لنموذج إدارة جديدة. */
const BLANK = {
  name: '',
  description: '',
  color: '#6366f1',
  icon: 'briefcase',
};

export default function DepartmentsPage() {
  return (
    <RequirePermission resource="departments">
      <DepartmentsContent />
    </RequirePermission>
  );
}

function DepartmentsContent() {
  const { data, can, createItem, updateItem, removeItem } = useStore();

  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [deleting, setDeleting] = useState<Department | null>(null);

  // عدد الأعضاء والرتب لكل إدارة
  const counts = useMemo(() => {
    const map = new Map<string, { members: number; ranks: number }>();
    data.departments.forEach((department) => {
      map.set(department.id, {
        members: data.members.filter((m) => m.departmentId === department.id).length,
        ranks: data.ranks.filter((r) => r.departmentId === department.id).length,
      });
    });
    return map;
  }, [data.departments, data.members, data.ranks]);

  function openCreate() {
    setForm(BLANK);
    setCreating(true);
  }

  function openEdit(department: Department) {
    setForm({
      name: department.name,
      description: department.description,
      color: department.color,
      icon: department.icon,
    });
    setEditing(department);
  }

  async function save() {
    if (!form.name.trim()) return;

    if (editing) {
      await updateItem(
        'departments',
        editing.id,
        { ...form },
        `تم تعديل بيانات إدارة «${form.name}»`,
      );
      setEditing(null);
    } else {
      await createItem(
        'departments',
        { ...form, isSupreme: false },
        `تم إنشاء إدارة جديدة «${form.name}»`,
      );
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('departments', deleting.id, `تم حذف إدارة «${deleting.name}»`);
    setDeleting(null);
  }

  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الإدارات"
        description="كل إدارة لها رتبها وأعضاؤها وصلاحياتها الخاصة. يمكنك إضافة إدارات جديدة في أي وقت."
        action={
          can('departments', 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              إدارة جديدة
            </Button>
          ) : null
        }
      />

      {data.departments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="لا توجد إدارات بعد"
            description="ابدأ بإنشاء أول إدارة في الاستوديو."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.departments.map((department) => {
            const Icon = departmentIcon(department.icon);
            const count = counts.get(department.id) ?? { members: 0, ranks: 0 };

            return (
              <Card
                key={department.id}
                className="group card-gradient flex flex-col p-5 transition-all duration-200 hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: department.color }}
                  >
                    <Icon className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-text">
                        {department.name}
                      </h3>
                      {department.isSupreme ? (
                        <Badge className="bg-accent-soft text-accent">
                          <Crown className="ml-1 size-2.5" />
                          عليا
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                      {department.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {formatNumber(count.members)} عضو
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="size-3.5" />
                    {formatNumber(count.ranks)} رتبة
                  </span>

                  <span className="mr-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {can('departments', 'edit') ? (
                      <button
                        onClick={() => openEdit(department)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                        aria-label={`تعديل ${department.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}

                    {/* الإدارة العليا محمية من الحذف حتى لا يفقد النظام صلاحياته الكاملة */}
                    {can('departments', 'delete') && !department.isSupreme ? (
                      <button
                        onClick={() => setDeleting(department)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                        aria-label={`حذف ${department.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </span>
                </div>

                <Link
                  href="/ranks"
                  className="mt-3 text-xs text-accent transition-opacity hover:opacity-75"
                >
                  إدارة الرتب والصلاحيات ←
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج الإضافة والتعديل */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل «${editing.name}»` : 'إنشاء إدارة جديدة'}
        description="الإدارة الجديدة تظهر مباشرة في النظام ويمكن إضافة رتب وأعضاء لها."
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
              {editing ? 'حفظ التعديلات' : 'إنشاء الإدارة'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="اسم الإدارة" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="مثال: إدارة التصميم"
              />
            </Field>

            <Field label="الأيقونة">
              <Select
                value={form.icon}
                onChange={(event) => setForm({ ...form, icon: event.target.value })}
              >
                {DEPARTMENT_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          <Field label="الوصف">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="ما الذي تختص به هذه الإدارة؟"
            />
          </Field>

          <Field label="لون التمييز">
            <div className="flex flex-wrap items-center gap-2">
              {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e'].map(
                (color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={cn(
                      'size-8 rounded-lg transition-transform hover:scale-110',
                      form.color === color && 'ring-2 ring-white/70 ring-offset-2 ring-offset-surface',
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`اختيار اللون ${color}`}
                  />
                ),
              )}
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="size-8 cursor-pointer rounded-lg border border-border bg-transparent"
                aria-label="لون مخصص"
              />
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف الإدارة"
        message={`سيتم حذف «${deleting?.name}» وجميع الرتب التابعة لها. الأعضاء المرتبطون بها لن يُحذفوا لكنهم سيفقدون ارتباطهم بالإدارة. لا يمكن التراجع عن هذه العملية.`}
      />
    </div>
  );
}
