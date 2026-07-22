'use client';

/** إدارة المهام — إنشاء ومتابعة المهام عبر كل الإدارات، مع التعليقات. */

import { AlertTriangle, ListChecks, MessageSquare, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PRIORITY, TASK_STATUS } from '@/core/domain/defaults';
import type { Priority, Task, TaskStatus } from '@/core/domain/types';
import { isTaskOverdue } from '@/core/services/selectors';
import { cn, daysUntil, formatDate, formatNumber, matchesSearch } from '@/core/utils/format';
import { newId, nowIso, todayIso } from '@/core/utils/id';
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

interface TaskForm {
  title: string;
  description: string;
  assigneeId: string;
  departmentId: string;
  projectId: string;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  dueDate: string;
}

export default function TasksPage() {
  return (
    <RequirePermission resource="tasks">
      <TasksContent />
    </RequirePermission>
  );
}

function TasksContent() {
  const { data, can, currentMember, createItem, updateItem, removeItem } = useStore();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [departmentId, setDepartmentId] = useState('all');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [viewing, setViewing] = useState<Task | null>(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState<TaskForm>(blankForm(data.departments[0]?.id ?? ''));

  const tasks = useMemo(() => {
    return data.tasks
      .filter((task) => {
        if (status === 'all') return true;
        if (status === 'open') return task.status !== 'done';
        if (status === 'overdue') return isTaskOverdue(task);
        return task.status === status;
      })
      .filter((task) => departmentId === 'all' || task.departmentId === departmentId)
      .filter(
        (task) => matchesSearch(task.title, search) || matchesSearch(task.description, search),
      )
      .sort((a, b) => {
        // المتأخرة أولاً، ثم حسب قرب الموعد
        const aLate = isTaskOverdue(a) ? 0 : 1;
        const bLate = isTaskOverdue(b) ? 0 : 1;
        if (aLate !== bLate) return aLate - bLate;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [data.tasks, status, departmentId, search]);

  function openCreate() {
    setForm(blankForm(data.departments[0]?.id ?? ''));
    setCreating(true);
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId ?? '',
      departmentId: task.departmentId,
      projectId: task.projectId ?? '',
      priority: task.priority,
      status: task.status,
      progress: task.progress,
      dueDate: task.dueDate,
    });
    setEditing(task);
  }

  async function save() {
    if (!form.title.trim()) return;

    const payload = {
      ...form,
      assigneeId: form.assigneeId || null,
      projectId: form.projectId || null,
    };

    if (editing) {
      await updateItem('tasks', editing.id, payload, `تم تعديل مهمة «${form.title}»`);
      setEditing(null);
    } else {
      await createItem(
        'tasks',
        { ...payload, comments: [] },
        `تم إنشاء مهمة جديدة «${form.title}»`,
      );
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('tasks', deleting.id, `تم حذف مهمة «${deleting.title}»`);
    setDeleting(null);
  }

  /** تغيير سريع للحالة من بطاقة المهمة مباشرة. */
  async function quickStatus(task: Task, next: TaskStatus) {
    await updateItem(
      'tasks',
      task.id,
      { status: next, progress: next === 'done' ? 100 : task.progress },
      `تم تغيير حالة مهمة «${task.title}» إلى ${TASK_STATUS[next].label}`,
    );
  }

  async function addComment() {
    if (!viewing || !comment.trim()) return;

    const updated = [
      ...viewing.comments,
      {
        id: newId(),
        authorId: currentMember?.id ?? 'system',
        body: comment.trim(),
        createdAt: nowIso(),
      },
    ];

    await updateItem(
      'tasks',
      viewing.id,
      { comments: updated },
      `تمت إضافة تعليق على مهمة «${viewing.title}»`,
    );
    setViewing({ ...viewing, comments: updated });
    setComment('');
  }

  const open = creating || editing !== null;
  const overdueCount = data.tasks.filter(isTaskOverdue).length;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="المهام"
        description="كل مهام الاستوديو مع المسؤولين والأولويات ومواعيد التسليم."
        action={
          can('tasks', 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              مهمة جديدة
            </Button>
          ) : null
        }
      />

      {overdueCount > 0 ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-rose-400" />
          <p className="text-xs text-rose-300">
            يوجد {formatNumber(overdueCount)} مهمة تجاوزت موعد التسليم وتحتاج متابعة.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث في المهام…"
          className="w-full sm:w-64"
        />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-auto">
          <option value="open">المفتوحة</option>
          <option value="overdue">المتأخرة</option>
          <option value="all">الكل</option>
          {Object.entries(TASK_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>
        <Select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="w-auto"
        >
          <option value="all">كل الإدارات</option>
          {data.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
        <span className="mr-auto text-xs text-faint">{formatNumber(tasks.length)} مهمة</span>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title="لا توجد مهام مطابقة"
            description="جرّب تغيير التصفية أو أنشئ مهمة جديدة."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => {
            const assignee = data.members.find((member) => member.id === task.assigneeId);
            const department = data.departments.find((item) => item.id === task.departmentId);
            const project = data.projects.find((item) => item.id === task.projectId);
            const late = isTaskOverdue(task);
            const remaining = daysUntil(task.dueDate);

            return (
              <Card
                key={task.id}
                className={cn(
                  'group p-4 transition-all duration-200 hover:border-border-strong',
                  late && 'border-rose-500/30',
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => setViewing(task)}
                      className="text-right text-sm font-medium text-text transition-colors hover:text-accent"
                    >
                      {task.title}
                    </button>

                    <p className="mt-1 line-clamp-1 text-xs text-muted">{task.description}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge className={PRIORITY[task.priority].className}>
                        {PRIORITY[task.priority].label}
                      </Badge>
                      <Badge className={TASK_STATUS[task.status].className}>
                        {TASK_STATUS[task.status].label}
                      </Badge>
                      {department ? (
                        <Badge>
                          <span
                            className="ml-1 inline-block size-1.5 rounded-full"
                            style={{ backgroundColor: department.color }}
                          />
                          {department.name}
                        </Badge>
                      ) : null}
                      {project ? <Badge>{project.name}</Badge> : null}
                      {task.comments.length > 0 ? (
                        <Badge>
                          <MessageSquare className="ml-1 size-2.5" />
                          {formatNumber(task.comments.length)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* المسؤول والموعد */}
                  <div className="flex items-center gap-4">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={assignee.name} color={assignee.avatarColor} size="sm" />
                        <span className="hidden text-xs text-muted sm:block">
                          {assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-faint">بدون مسؤول</span>
                    )}

                    <div className="text-left">
                      <p className={cn('text-xs', late ? 'text-rose-400' : 'text-muted')}>
                        {formatDate(task.dueDate)}
                      </p>
                      <p className="text-[10px] text-faint">
                        {late
                          ? `متأخرة ${formatNumber(Math.abs(remaining))} يوم`
                          : task.status === 'done'
                            ? 'مكتملة'
                            : `متبقٍ ${formatNumber(Math.max(0, remaining))} يوم`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {can('tasks', 'edit') ? (
                        <button
                          onClick={() => openEdit(task)}
                          className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                          aria-label={`تعديل ${task.title}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      ) : null}
                      {can('tasks', 'delete') ? (
                        <button
                          onClick={() => setDeleting(task)}
                          className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                          aria-label={`حذف ${task.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Progress value={task.progress} className="flex-1" />
                  <span className="shrink-0 text-[10px] text-faint">{task.progress}%</span>

                  {can('tasks', 'edit') ? (
                    <select
                      value={task.status}
                      onChange={(event) => quickStatus(task, event.target.value as TaskStatus)}
                      className="shrink-0 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
                      aria-label="تغيير الحالة"
                    >
                      {Object.entries(TASK_STATUS).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج المهمة */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'تعديل المهمة' : 'مهمة جديدة'}
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
            <Button variant="primary" onClick={save} disabled={!form.title.trim()}>
              {editing ? 'حفظ التعديلات' : 'إنشاء المهمة'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="اسم المهمة" required>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="مثال: إصلاح خلل في حفظ البيانات"
            />
          </Field>

          <Field label="الوصف">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>

          <FormGrid>
            <Field label="المسؤول">
              <Select
                value={form.assigneeId}
                onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}
              >
                <option value="">بدون مسؤول</option>
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="الإدارة">
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

            <Field label="المشروع">
              <Select
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              >
                <option value="">بدون مشروع</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
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

            <Field label="الحالة">
              <Select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
              >
                {Object.entries(TASK_STATUS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="موعد التسليم">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </Field>
          </FormGrid>

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
        </div>
      </Modal>

      {/* تفاصيل المهمة والتعليقات */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? ''}
        description={viewing ? `موعد التسليم: ${formatDate(viewing.dueDate)}` : undefined}
      >
        {viewing ? (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-muted">
              {viewing.description || 'لا يوجد وصف لهذه المهمة.'}
            </p>

            <div className="flex flex-wrap gap-1.5">
              <Badge className={PRIORITY[viewing.priority].className}>
                {PRIORITY[viewing.priority].label}
              </Badge>
              <Badge className={TASK_STATUS[viewing.status].className}>
                {TASK_STATUS[viewing.status].label}
              </Badge>
              <Badge>الإنجاز {viewing.progress}%</Badge>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
                <MessageSquare className="size-3.5" />
                التعليقات ({formatNumber(viewing.comments.length)})
              </p>

              {viewing.comments.length === 0 ? (
                <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-xs text-faint">
                  لا توجد تعليقات بعد.
                </p>
              ) : (
                <ul className="space-y-2">
                  {viewing.comments.map((item) => {
                    const author = data.members.find((member) => member.id === item.authorId);
                    return (
                      <li key={item.id} className="flex gap-2.5 rounded-lg bg-surface-2 p-3">
                        {author ? (
                          <Avatar name={author.name} color={author.avatarColor} size="sm" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text">
                              {author?.name ?? 'النظام'}
                            </span>
                            <span className="text-[10px] text-faint">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {can('tasks', 'edit') ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void addComment();
                    }}
                    placeholder="اكتب تعليقاً…"
                  />
                  <Button variant="primary" onClick={addComment} disabled={!comment.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف المهمة"
        message={`سيتم حذف «${deleting?.title}» نهائياً مع كل تعليقاتها.`}
      />
    </div>
  );
}

function blankForm(departmentId: string): TaskForm {
  return {
    title: '',
    description: '',
    assigneeId: '',
    departmentId,
    projectId: '',
    priority: 'medium',
    status: 'todo',
    progress: 0,
    dueDate: todayIso(),
  };
}
