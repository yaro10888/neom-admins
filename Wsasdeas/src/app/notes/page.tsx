'use client';

/**
 * الملاحظات الخاصة بالإدارة.
 *
 * تُعرض مجمّعة حسب الشخص تماماً كما تُكتب على الورق:
 *   محمد
 *     • يحتاج تحسين سرعة العمل
 *     • ممتاز في البرمجة
 */

import { Lock, Pencil, Pin, Plus, StickyNote, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { NOTE_CATEGORY } from '@/core/domain/defaults';
import type { Note, NoteCategory } from '@/core/domain/types';
import { cn, formatDate, formatNumber, matchesSearch } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, SearchInput, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives';

export default function NotesPage() {
  return (
    <RequirePermission resource="notes">
      <NotesContent />
    </RequirePermission>
  );
}

function NotesContent() {
  const { data, can, currentMember, createItem, updateItem, removeItem } = useStore();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [form, setForm] = useState({
    memberId: '',
    content: '',
    category: 'neutral' as NoteCategory,
  });

  /** الملاحظات المصفّاة ثم المجمّعة حسب العضو. */
  const grouped = useMemo(() => {
    const filtered = data.notes
      .filter((note) => category === 'all' || note.category === category)
      .filter((note) => {
        if (!search.trim()) return true;
        const member = data.members.find((item) => item.id === note.memberId);
        return (
          matchesSearch(note.content, search) || matchesSearch(member?.name ?? '', search)
        );
      });

    const map = new Map<string, Note[]>();
    filtered.forEach((note) => {
      const list = map.get(note.memberId) ?? [];
      list.push(note);
      map.set(note.memberId, list);
    });

    return [...map.entries()]
      .map(([memberId, notes]) => ({
        member: data.members.find((item) => item.id === memberId),
        memberId,
        // المثبّتة أولاً ثم الأحدث
        notes: notes.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
      }))
      .filter((group) => group.member)
      .sort((a, b) => (a.member?.name ?? '').localeCompare(b.member?.name ?? '', 'ar'));
  }, [data.notes, data.members, search, category]);

  const totalShown = grouped.reduce((sum, group) => sum + group.notes.length, 0);

  function openCreate(memberId?: string) {
    setForm({
      memberId: memberId ?? data.members[0]?.id ?? '',
      content: '',
      category: 'neutral',
    });
    setCreating(true);
  }

  function openEdit(note: Note) {
    setForm({ memberId: note.memberId, content: note.content, category: note.category });
    setEditing(note);
  }

  async function save() {
    if (!form.content.trim() || !form.memberId) return;
    const member = data.members.find((item) => item.id === form.memberId);

    if (editing) {
      await updateItem(
        'notes',
        editing.id,
        { content: form.content, category: form.category, memberId: form.memberId },
        `تم تعديل ملاحظة عن ${member?.name ?? 'عضو'}`,
      );
      setEditing(null);
    } else {
      await createItem(
        'notes',
        { ...form, authorId: currentMember?.id ?? '', pinned: false },
        `تمت إضافة ملاحظة عن ${member?.name ?? 'عضو'}`,
      );
      setCreating(false);
    }
  }

  async function togglePin(note: Note) {
    await updateItem(
      'notes',
      note.id,
      { pinned: !note.pinned },
      note.pinned ? 'تم إلغاء تثبيت ملاحظة' : 'تم تثبيت ملاحظة',
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('notes', deleting.id, 'تم حذف ملاحظة خاصة');
    setDeleting(null);
  }

  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الملاحظات الخاصة"
        description="ملاحظات إدارية عن أعضاء الاستوديو — تظهر للإدارة فقط ولا يراها الأعضاء."
        action={
          can('notes', 'create') ? (
            <Button variant="primary" onClick={() => openCreate()}>
              <Plus className="size-4" />
              ملاحظة جديدة
            </Button>
          ) : null
        }
      />

      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-3">
        <Lock className="size-4 shrink-0 text-accent" />
        <p className="text-xs text-muted">
          هذه الصفحة خاصة بالإدارة. الوصول إليها محكوم بصلاحية «الملاحظات الخاصة» في نظام الرتب.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث في الملاحظات أو بأسماء الأشخاص…"
          className="w-full sm:w-80"
        />
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-auto"
        >
          <option value="all">كل التصنيفات</option>
          {Object.entries(NOTE_CATEGORY).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>
        <span className="mr-auto text-xs text-faint">
          {formatNumber(totalShown)} ملاحظة عن {formatNumber(grouped.length)} شخص
        </span>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <EmptyState
            icon={StickyNote}
            title={search ? 'لا توجد ملاحظات مطابقة' : 'لا توجد ملاحظات بعد'}
            description={
              search
                ? 'جرّب كلمة بحث أخرى.'
                : 'ابدأ بكتابة ملاحظة عن أي عضو في الاستوديو.'
            }
            action={
              can('notes', 'create') ? (
                <Button size="sm" onClick={() => openCreate()}>
                  <Plus className="size-3.5" />
                  ملاحظة جديدة
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.map((group) => (
            <Card key={group.memberId} className="overflow-hidden">
              {/* رأس بطاقة الشخص */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <Avatar
                  name={group.member!.name}
                  color={group.member!.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/members/view?id=${group.memberId}`}
                    className="block truncate text-sm font-semibold text-text transition-colors hover:text-accent"
                  >
                    {group.member!.name}
                  </Link>
                  <p className="truncate text-[11px] text-faint">
                    {group.member!.specialty} — {formatNumber(group.notes.length)} ملاحظة
                  </p>
                </div>

                {can('notes', 'create') ? (
                  <Button size="sm" variant="ghost" onClick={() => openCreate(group.memberId)}>
                    <Plus className="size-3.5" />
                  </Button>
                ) : null}
              </div>

              {/* الملاحظات كنقاط */}
              <ul className="divide-y divide-border/50">
                {group.notes.map((note) => {
                  const meta = NOTE_CATEGORY[note.category];
                  const author = data.members.find((item) => item.id === note.authorId);

                  return (
                    <li
                      key={note.id}
                      className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          note.category === 'positive'
                            ? 'bg-emerald-500'
                            : note.category === 'negative'
                              ? 'bg-rose-500'
                              : note.category === 'action'
                                ? 'bg-amber-500'
                                : 'bg-slate-500',
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed text-text">{note.content}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge className={meta.className}>{meta.label}</Badge>
                          {note.pinned ? (
                            <Badge className="bg-accent-soft text-accent">
                              <Pin className="ml-1 size-2.5" />
                              مثبّتة
                            </Badge>
                          ) : null}
                          <span className="text-[10px] text-faint">
                            {formatDate(note.createdAt)}
                            {author ? ` — ${author.name}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {can('notes', 'edit') ? (
                          <>
                            <button
                              onClick={() => togglePin(note)}
                              className={cn(
                                'grid size-7 place-items-center rounded-md hover:bg-surface-3',
                                note.pinned ? 'text-accent' : 'text-muted hover:text-text',
                              )}
                              aria-label={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                            >
                              <Pin className="size-3.5" />
                            </button>
                            <button
                              onClick={() => openEdit(note)}
                              className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                              aria-label="تعديل"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </>
                        ) : null}
                        {can('notes', 'delete') ? (
                          <button
                            onClick={() => setDeleting(note)}
                            className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                            aria-label="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* نموذج الملاحظة */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
        description="الملاحظات مرئية للإدارة فقط."
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
            <Button variant="primary" onClick={save} disabled={!form.content.trim()}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="عن أي شخص؟" required>
              <Select
                value={form.memberId}
                onChange={(event) => setForm({ ...form, memberId: event.target.value })}
              >
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="التصنيف">
              <Select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value as NoteCategory })
                }
              >
                {Object.entries(NOTE_CATEGORY).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          <Field label="نص الملاحظة" required hint="اكتب ملاحظة واحدة في كل مرة لتبقى مرتبة">
            <Textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="مثال: يحتاج تحسين سرعة العمل"
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف الملاحظة"
        message="سيتم حذف هذه الملاحظة نهائياً."
      />
    </div>
  );
}
