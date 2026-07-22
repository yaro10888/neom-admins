'use client';

/**
 * مستند البيان الرسمي.
 *
 * يُستخدم في مكانين بنفس الشكل تماماً: المعاينة قبل الإرسال، وصفحة الطباعة
 * التي تُحفظ كـ PDF. توحيد المكوّن يضمن أن ما تراه في المعاينة هو نفسه
 * ما سيخرج في الملف.
 */

import type { Department, Member, Rank, Statement } from '@/core/domain/types';
import { formatDate, formatDateTime } from '@/core/utils/format';

export interface StatementDocumentData {
  statement: Pick<Statement, 'title' | 'body' | 'byHigherOrder' | 'higherOrderNote'> & {
    number?: number;
    createdAt?: string;
  };
  author: Member | null;
  department: Department | null;
  rank: Rank | null;
  studioName: string;
}

export function StatementDocument({
  statement,
  author,
  department,
  rank,
  studioName,
}: StatementDocumentData) {
  return (
    <article className="rounded-xl border border-border bg-white p-8 text-black print:rounded-none print:border-0 print:p-0">
      {/* الترويسة */}
      <header className="border-b-2 border-gray-800 pb-4 text-center">
        <h1 className="text-xl font-bold">{studioName}</h1>
        <p className="mt-1 text-sm text-gray-600">بيان رسمي</p>
      </header>

      {/* بيانات البيان */}
      <div className="mt-5 grid grid-cols-2 gap-3 text-[11px]">
        <Cell label="رقم البيان" value={statement.number ? `#${statement.number}` : '— (لم يُرسل بعد)'} />
        <Cell
          label="التاريخ"
          value={
            statement.createdAt ? formatDateTime(statement.createdAt) : formatDate(new Date().toISOString())
          }
        />
      </div>

      {/* العنوان والموضوع */}
      <section className="mt-6">
        <h2 className="border-r-4 border-gray-800 pr-2 text-lg font-bold">{statement.title}</h2>
        <p className="mt-3 text-sm leading-loose whitespace-pre-wrap">{statement.body}</p>
      </section>

      {/* مصدر الأمر */}
      <section className="mt-6 rounded border border-gray-300 p-3">
        <p className="text-[11px] font-bold">مصدر البيان</p>
        <p className="mt-1 text-[11px]">
          {statement.byHigherOrder
            ? 'صادر بأمر من رتبة أعلى داخل نفس الإدارة.'
            : 'صادر بمبادرة من مُرسِل البيان دون أمر من رتبة أعلى.'}
        </p>
        {statement.byHigherOrder && statement.higherOrderNote ? (
          <p className="mt-1 text-[11px] text-gray-700">
            التفاصيل: {statement.higherOrderNote}
          </p>
        ) : null}
      </section>

      {/* بيانات المرسِل الكاملة */}
      <section className="mt-6">
        <p className="mb-2 border-r-4 border-gray-800 pr-2 text-sm font-bold">بيانات المُرسِل</p>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <Cell label="الاسم" value={author?.name ?? '—'} />
          <Cell label="الإدارة" value={department?.name ?? 'بلا إدارة'} />
          <Cell label="الرتبة" value={rank?.name ?? 'بلا رتبة'} />
          <Cell label="مستوى الرتبة" value={rank ? String(rank.level) : '—'} />
          <Cell label="التخصص" value={author?.specialty || '—'} />
          <Cell label="حالة العضو" value={statusLabel(author)} />
          <Cell label="اسم ديسكورد" value={author?.discordUsername ?? '—'} />
          <Cell label="اسم Roblox" value={author?.robloxUsername ?? '—'} />
          <Cell label="الإيميل" value={author?.email ?? '—'} />
          <Cell
            label="تاريخ الانضمام"
            value={author ? formatDate(author.joinDate) : '—'}
          />
        </div>
      </section>

      <footer className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
        مستند مولَّد آلياً من نظام إدارة {studioName}
      </footer>
    </article>
  );
}

function statusLabel(member: Member | null): string {
  if (!member) return '—';
  const map = { active: 'نشط', vacation: 'إجازة', suspended: 'متوقف' } as const;
  return map[member.status] ?? member.status;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-300 px-2.5 py-1.5">
      <p className="text-[10px] text-gray-600">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
