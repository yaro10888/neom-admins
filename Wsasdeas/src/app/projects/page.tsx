'use client';

/** إدارة المشاريع — كل مشروع مع فريقه ومهامه ونسبة إنجازه. */

import { CalendarClock, FolderKanban, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PRIORITY, PROJECT_STATUS } from '@/core/domain/defaults';
import type { Priority, Project, ProjectStatus } from '@/core/domain/types';
import { cn, daysUntil, formatDate, formatMoney, formatNumber, matchesSearch } from '@/core/utils/format';
import { todayIso } from '@/core/utils/id';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
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

interface ProjectForm {
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  priority: Priority;
  startDate: string;
  dueDate: string;
  memberIds: string[];
  budget: number;
  gameUrl: string;
}

const BLANK: ProjectForm = {
  name: '',
  description: '',
  status: 'planning',
  progress: 0,
  priority: 'medium',
  startDate: todayIso(),
  dueDate: todayIso(),
  memberIds: [],
  budget: 0,
  gameUrl: '',
};

export default function ProjectsPage() {
  return (
    <RequirePermission resource="projects">
      <ProjectsContent />
    </RequirePermission>
  );
}

function ProjectsContent() {
  const { data, can, createItem, updateItem, removeItem } = useStore();
  const currency = data.settings.currency;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(BLANK);

  const projects = useMemo(
    () =>
      data.projects
        .filter((project) => status === 'all' || project.status === status)
        .filter(
          (project) =>
            matchesSearch(project.name, search) || matchesSearch(project.description, search),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data.projects, status, search],
  );

  function openCreate() {
    setForm(BLANK);
    setCreating(true);
  }

  function openEdit(project: Project) {
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      priority: project.priority,
      startDate: project.startDate,
      dueDate: project.dueDate,
      memberIds: [...project.memberIds],
      budget: project.budget,
      gameUrl: project.gameUrl ?? '',
    });
    setEditing(project);
  }

  async function save() {
    if (!form.name.trim()) return;

    if (editing) {
      await updateItem('projects', editing.id, { ...form }, `تم تعديل مشروع «${form.name}»`);
      setEditing(null);
    } else {
      await createItem('projects', { ...form }, `تم إنشاء مشروع جديد «${form.name}»`);
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('projects', deleting.id, `تم حذف مشروع «${deleting.name}»`);
    setDeleting(null);
  }

  function toggleMember(memberId: string) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  }

  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="المشاريع"
        description="كل ألعاب الاستوديو مع حالتها وفريقها ونسبة إنجازها."
        action={
          can('projects', 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              مشروع جديد
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث عن مشروع…"
          className="w-full sm:w-72"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-auto"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(PROJECT_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>
        <span className="mr-auto text-xs text-faint">{formatNumber(projects.length)} مشروع</span>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="لا توجد مشاريع"
            description="ابدأ بإنشاء أول مشروع للاستوديو."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {projects.map((project) => {
            const statusMeta = PROJECT_STATUS[project.status];
            const priorityMeta = PRIORITY[project.priority];
            const remaining = daysUntil(project.dueDate);
            const late =
              remaining < 0 && project.status !== 'released' && project.status !== 'cancelled';
            const projectTasks = data.tasks.filter((task) => task.projectId === project.id);

            return (
              <Card key={project.id} className="group card-gradient flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text">{project.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                      <Badge className={priorityMeta.className}>{priorityMeta.label}</Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {can('projects', 'edit') ? (
                      <button
                        onClick={() => openEdit(project)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                        aria-label={`تعديل ${project.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}
                    {can('projects', 'delete') ? (
                      <button
                        onClick={() => setDeleting(project)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                        aria-label={`حذف ${project.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                  {project.description}
                </p>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">نسبة الإنجاز</span>
                    <span className="font-medium text-text">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-faint">البداية</p>
                    <p className="mt-0.5 text-muted">{formatDate(project.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-faint">التسليم</p>
                    <p className={cn('mt-0.5', late ? 'text-rose-400' : 'text-muted')}>
                      {formatDate(project.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                  {/* فريق المشروع */}
                  <div className="flex items-center -space-x-2 space-x-reverse">
                    {project.memberIds.slice(0, 4).map((memberId) => {
                      const member = data.members.find((item) => item.id === memberId);
                      if (!member) return null;
                      return (
                        <span
                          key={memberId}
                          className="rounded-full ring-2 ring-[var(--surface)]"
                          title={member.name}
                        >
                          <Avatar name={member.name} color={member.avatarColor} size="sm" />
                        </span>
                      );
                    })}
                    {project.memberIds.length > 4 ? (
                      <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[10px] text-muted ring-2 ring-[var(--surface)]">
                        +{project.memberIds.length - 4}
                      </span>
                    ) : null}
                    {project.memberIds.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-faint">
                        <Users className="size-3" />
                        بدون فريق
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-faint">
                    <span>{formatNumber(projectTasks.length)} مهمة</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      {late
                        ? `متأخر ${formatNumber(Math.abs(remaining))} يوم`
                        : `${formatNumber(Math.max(0, remaining))} يوم`}
                    </span>
                  </div>
                </div>

                {project.budget > 0 ? (
                  <p className="mt-2 text-[10px] text-faint">
                    الميزانية: {formatMoney(project.budget, currency)}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج المشروع */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل «${editing.name}»` : 'مشروع جديد'}
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
              {editing ? 'حفظ التعديلات' : 'إنشاء المشروع'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="اسم المشروع" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="مثال: Tower Defense Legends"
              />
            </Field>

            <Field label="رابط اللعبة">
              <Input
                value={form.gameUrl}
                onChange={(event) => setForm({ ...form, gameUrl: event.target.value })}
                placeholder="https://www.roblox.com/games/…"
                dir="ltr"
              />
            </Field>

            <Field label="الحالة">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as ProjectStatus })
                }
              >
                {Object.entries(PROJECT_STATUS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الأولوية">
              <Select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}
              >
                {Object.entries(PRIORITY).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="تاريخ البداية">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </Field>

            <Field label="موعد التسليم">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </Field>

            <Field label="الميزانية">
              <Input
                type="number"
                min={0}
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label={`نسبة الإنجاز — ${form.progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })}
                className="mt-2 w-full accent-[var(--accent)]"
              />
            </Field>
          </FormGrid>

          <Field label="وصف المشروع">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="فكرة اللعبة وأنظمتها الأساسية"
            />
          </Field>

          <Field label="فريق العمل" hint="اختر المطورين المسؤولين عن هذا المشروع">
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border bg-surface-2 p-2 sm:grid-cols-2">
              {data.members.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-3"
                >
                  <input
                    type="checkbox"
                    checked={form.memberIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                  <Avatar name={member.name} color={member.avatarColor} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-text">{member.name}</span>
                    <span className="block truncate text-[10px] text-faint">
                      {member.specialty}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف المشروع"
        message={`سيتم حذف «${deleting?.name}». المهام المرتبطة به ستبقى موجودة لكن بدون مشروع.`}
      />
    </div>
  );
}
