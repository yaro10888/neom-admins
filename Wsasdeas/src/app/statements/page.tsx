'use client';

/** البيانات المرسلة — تظهر لمن تملك رتبته صلاحية عرض البيانات. */

import { FileText, Megaphone, Search, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Statement } from '@/core/domain/types';
import { formatDateTime, formatNumber, matchesSearch } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { SearchInput } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '@/components/ui/primitives';

export default function StatementsPage() {
  return (
    <RequirePermission resource="statements">
      <StatementsContent />
    </RequirePermission>
  );
}

function StatementsContent() {
  const { data, can, removeItem } = useStore();

  const [search, setSearch] = useState('');
  const [viewingAuthor, setViewingAuthor] = useState<Statement | null>(null);
  const [deleting, setDeleting] = useState<Statement | null>(null);

  const statements = useMemo(
    () =>
      data.statements
        .filter(
          (statement) =>
            matchesSearch(statement.title, search) ||
            matchesSearch(statement.body, search) ||
            matchesSearch(statement.authorName, search),
        )
        .sort((a, b) => b.number - a.number),
    [data.statements, search],
  );

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="البيانات المرسلة"
        description="كل البيانات الرسمية الصادرة، مع مُرسِلها وملف PDF كامل لكل بيان."
        action={
          can('statements', 'create') ? (
            <Link href="/statements/new">
              <Button variant="primary">
                <Megaphone className="size-4" />
                إرسال بيان
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في البيانات…"
          className="w-full sm:w-72"
        />
        <span className="mr-auto text-xs text-faint">{formatNumber(statements.length)} بيان</span>
      </div>

      {statements.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="لا توجد بيانات مرسلة"
            description="أي بيان يُرسل سيظهر هنا برقم تسلسلي وملف PDF."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {statements.map((statement) => {
            const author = data.members.find((m) => m.id === statement.authorId);
            const department = data.departments.find((d) => d.id === author?.departmentId);
            const rank = data.ranks.find((r) => r.id === author?.rankId);

            return (
              <Card key={statement.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  {/* رقم البيان */}
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
                    #{statement.number}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-text">{statement.title}</h3>
                      {statement.byHigherOrder ? (
                        <Badge className="bg-violet-500/15 text-violet-400">
                          بأمر من رتبة أعلى
                        </Badge>
                      ) : (
                        <Badge>بمبادرة شخصية</Badge>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                      {statement.body}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
                      <span>{formatDateTime(statement.createdAt)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        {author ? (
                          <Avatar name={author.name} color={author.avatarColor} size="sm" />
                        ) : null}
                        {statement.authorName}
                      </span>
                      {rank ? <span>{rank.name}</span> : null}
                      {department ? <span>{department.name}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewingAuthor(statement)}>
                      <User className="size-3.5" />
                      معلومات الحساب
                    </Button>

                    <Link href={`/statements/print?id=${statement.id}`}>
                      <Button size="sm" variant="secondary">
                        <FileText className="size-3.5" />
                        ملف PDF
                      </Button>
                    </Link>

                    {can('statements', 'delete') ? (
                      <button
                        onClick={() => setDeleting(statement)}
                        className="grid size-8 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                        aria-label="حذف البيان"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* معلومات حساب المرسِل */}
      <Modal
        open={viewingAuthor !== null}
        onClose={() => setViewingAuthor(null)}
        title="معلومات حساب المُرسِل"
      >
        {viewingAuthor ? <AuthorCard statement={viewingAuthor} /> : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await removeItem('statements', deleting.id, `تم حذف البيان رقم ${deleting.number}`);
          setDeleting(null);
        }}
        title="حذف البيان"
        message={`سيتم حذف البيان رقم ${deleting?.number} نهائياً.`}
      />
    </div>
  );
}

function AuthorCard({ statement }: { statement: Statement }) {
  const { data } = useStore();
  const author = data.members.find((m) => m.id === statement.authorId);

  if (!author) {
    return (
      <p className="text-sm text-muted">
        الحساب المرسِل لم يعد موجوداً. الاسم وقت الإرسال: {statement.authorName}
      </p>
    );
  }

  const department = data.departments.find((d) => d.id === author.departmentId);
  const rank = data.ranks.find((r) => r.id === author.rankId);

  const rows: [string, string][] = [
    ['الاسم', author.name],
    ['الإدارة', department?.name ?? 'بلا إدارة'],
    ['الرتبة', rank?.name ?? 'بلا رتبة'],
    ['التخصص', author.specialty || '—'],
    ['اسم ديسكورد', author.discordUsername ?? '—'],
    ['اسم Roblox', author.robloxUsername ?? '—'],
    ['الإيميل', author.email ?? '—'],
    ['حالة الحساب', author.isActive ? 'مفعّل' : 'موقوف'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={author.name} color={author.avatarColor} size="lg" />
        <div>
          <p className="text-base font-semibold text-text">{author.name}</p>
          <p className="text-xs text-muted">
            {rank?.name ?? 'بلا رتبة'} — {department?.name ?? 'بلا إدارة'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-2 px-3 py-2">
            <dt className="text-[10px] text-faint">{label}</dt>
            <dd className="mt-0.5 truncate text-xs text-text">{value}</dd>
          </div>
        ))}
      </dl>

      <Link href={`/members/view?id=${author.id}`}>
        <Button variant="secondary" className="w-full">
          <Search className="size-4" />
          فتح الملف الكامل للحساب
        </Button>
      </Link>
    </div>
  );
}
