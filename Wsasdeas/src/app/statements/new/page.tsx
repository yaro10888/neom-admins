'use client';

/** إرسال بيان رسمي — تظهر فقط لمن تملك رتبته صلاحية «إضافة» في البيانات. */

import { AlertTriangle, Eye, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { StatementDocument } from '@/components/features/statement-document';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Button, Card, CardHeader, PageHeader } from '@/components/ui/primitives';

export default function NewStatementPage() {
  return (
    <RequirePermission resource="statements">
      <NewStatementContent />
    </RequirePermission>
  );
}

function NewStatementContent() {
  const { data, can, currentMember, createItem } = useStore();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [byHigherOrder, setByHigherOrder] = useState<'no' | 'yes'>('no');
  const [higherOrderNote, setHigherOrderNote] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const department = data.departments.find((d) => d.id === currentMember?.departmentId) ?? null;
  const rank = data.ranks.find((r) => r.id === currentMember?.rankId) ?? null;

  const canSend = can('statements', 'create');
  const valid = title.trim().length > 0 && body.trim().length > 0;

  const documentData = {
    statement: {
      title: title || 'عنوان البيان',
      body: body || 'نص البيان…',
      byHigherOrder: byHigherOrder === 'yes',
      higherOrderNote,
    },
    author: currentMember,
    department,
    rank,
    studioName: data.settings.studioName,
  };

  async function send() {
    if (!valid || !canSend) return;
    setBusy(true);
    setError(null);

    try {
      await createItem(
        'statements',
        {
          title: title.trim(),
          body: body.trim(),
          byHigherOrder: byHigherOrder === 'yes',
          higherOrderNote: higherOrderNote.trim(),
          authorId: currentMember?.id ?? null,
          authorName: currentMember?.name ?? 'غير معروف',
        },
        `تم إرسال بيان رسمي: ${title.trim()}`,
      );

      // بعد الإرسال ننتقل مباشرة إلى صفحة البيانات المرسلة كما هو مطلوب
      router.push('/statements');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر إرسال البيان.');
      setBusy(false);
    }
  }

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="إرسال بيان"
        description="اكتب البيان الرسمي، عاينه كما سيظهر في ملف PDF، ثم أرسله."
      />

      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader title="محتوى البيان" icon={Send} />
        <div className="space-y-5 p-5">
          <Field label="عنوان البيان" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحديث مواعيد تسليم المشاريع"
            />
          </Field>

          <Field label="نص البيان / الموضوع" required>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب موضوع البيان بالتفصيل…"
              className="min-h-48"
            />
          </Field>

          <Field
            label="هل هذا البيان صادر بأمر من رتبة أعلى منك في إدارتك؟"
            required
          >
            <div className="flex flex-wrap gap-2">
              <ChoiceButton
                active={byHigherOrder === 'no'}
                onClick={() => setByHigherOrder('no')}
                label="لا — بمبادرة مني"
              />
              <ChoiceButton
                active={byHigherOrder === 'yes'}
                onClick={() => setByHigherOrder('yes')}
                label="نعم — بأمر من رتبة أعلى"
              />
            </div>
          </Field>

          {byHigherOrder === 'yes' ? (
            <Field label="من أصدر الأمر؟" hint="اذكر الاسم أو الرتبة التي أمرت بإصدار البيان">
              <Input
                value={higherOrderNote}
                onChange={(e) => setHigherOrderNote(e.target.value)}
                placeholder="مثال: بأمر من قائد فريق التطوير"
              />
            </Field>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setPreview(true)} disabled={!valid}>
              <Eye className="size-4" />
              معاينة الملف قبل الإرسال
            </Button>
            <Button variant="primary" onClick={send} disabled={!valid || busy || !canSend}>
              <Send className="size-4" />
              {busy ? 'جارٍ الإرسال…' : 'إرسال البيان'}
            </Button>
          </div>

          {!canSend ? (
            <p className="text-xs text-amber-400">
              رتبتك لا تملك صلاحية إرسال البيانات — يمكنك المعاينة فقط.
            </p>
          ) : null}
        </div>
      </Card>

      {/* معاينة المستند كما سيظهر في PDF */}
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="معاينة البيان"
        description="هكذا سيظهر البيان في ملف PDF بعد إرساله."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(false)}>
              تعديل
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPreview(false);
                void send();
              }}
              disabled={!canSend || busy}
            >
              <Send className="size-4" />
              تأكيد الإرسال
            </Button>
          </>
        }
      >
        <StatementDocument {...documentData} />
      </Modal>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-lg border border-accent bg-accent-soft px-4 py-2.5 text-xs font-medium text-accent'
          : 'rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-text'
      }
    >
      {label}
    </button>
  );
}
