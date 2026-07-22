'use client';

/**
 * صفحة PDF الخاصة ببيان واحد.
 *
 * تُفتح بـ ‎/statements/print?id=xxx‎ — استُخدم مُعامل استعلام بدل مسار
 * ديناميكي حتى يعمل التصدير الثابت المرفوع على Cloudflare.
 */

import { ArrowRight, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { StatementDocument } from '@/components/features/statement-document';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui/primitives';
import { FileWarning } from 'lucide-react';

export default function StatementPrintPage() {
  return (
    <RequirePermission resource="statements">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintView />
      </Suspense>
    </RequirePermission>
  );
}

function PrintView() {
  const params = useSearchParams();
  const id = params.get('id');
  const { data } = useStore();

  const statement = data.statements.find((item) => item.id === id) ?? null;
  const author = data.members.find((m) => m.id === statement?.authorId) ?? null;
  const department = data.departments.find((d) => d.id === author?.departmentId) ?? null;
  const rank = data.ranks.find((r) => r.id === author?.rankId) ?? null;

  // فتح نافذة الطباعة تلقائياً بعد ظهور المستند
  useEffect(() => {
    if (!statement) return;
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, [statement]);

  if (!statement) {
    return (
      <Card>
        <EmptyState
          icon={FileWarning}
          title="البيان غير موجود"
          description="ربما حُذف البيان أو أن الرابط غير صحيح."
          action={
            <Link href="/statements">
              <Button size="sm" variant="secondary">
                العودة للبيانات
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/statements"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
        >
          <ArrowRight className="size-3.5" />
          العودة للبيانات المرسلة
        </Link>

        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="size-4" />
          طباعة / حفظ كـ PDF
        </Button>
      </div>

      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted print:hidden">
        ستُفتح نافذة الطباعة تلقائياً. اختر{' '}
        <strong className="text-text">الوجهة: حفظ كـ PDF</strong> ثم اضغط حفظ.
      </p>

      <StatementDocument
        statement={statement}
        author={author}
        department={department}
        rank={rank}
        studioName={data.settings.studioName}
      />
    </div>
  );
}
