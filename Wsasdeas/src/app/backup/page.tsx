'use client';

/** النسخ الاحتياطي — تصدير كل البيانات (JSON / PDF) واستيرادها. */

import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileJson,
  FileText,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  BackupValidationError,
  COLLECTION_LABELS,
  backupFilename,
  buildBackup,
  downloadFile,
  parseBackup,
  type BackupFile,
} from '@/core/services/backup';
import { formatDateTime, formatNumber } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { ConfirmDialog } from '@/components/ui/modal';
import { Button, Card, CardHeader, PageHeader } from '@/components/ui/primitives';

export default function BackupPage() {
  return (
    <RequirePermission resource="backup">
      <BackupContent />
    </RequirePermission>
  );
}

function BackupContent() {
  const { data, importSnapshot, logActivity, logBackup } = useStore();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const backup = buildBackup(data);

  /**
   * تنزيل نسخة JSON كاملة قابلة للاستيراد لاحقاً.
   * بعد حفظ الملف على الجهاز يُسجَّل الحدث، وقاعدة البيانات ترسل إشعار
   * ديسكورد تلقائياً (اسم الاداري، اسمه في ديسكورد، التوقيت، النسخة).
   */
  async function exportJson() {
    downloadFile(JSON.stringify(backup, null, 2), backupFilename('json'), 'application/json');
    await logActivity('export', 'backup', 'json', 'تم تصدير نسخة احتياطية كاملة بصيغة JSON');
    await notifyBackup('JSON');
    setError(null);
  }

  /** فتح التقرير المهيّأ للطباعة — يُحفظ كـ PDF من نافذة الطباعة. */
  async function exportPdf() {
    await logActivity('export', 'backup', 'pdf', 'تم تصدير تقرير PDF لبيانات النظام');
    await notifyBackup('PDF');
    router.push('/backup/report');
  }

  /** يسجّل النسخة ويُطلق إشعار ديسكورد. */
  async function notifyBackup(format: string) {
    try {
      await logBackup(format);
      setSuccess(`تم إنشاء النسخة (${format}) وإرسال إشعار ديسكورد.`);
    } catch (caught) {
      // فشل الإشعار يجب ألا يوهم المستخدم بأن النسخة نفسها فشلت
      setSuccess(`تم إنشاء النسخة (${format})، لكن تعذّر إرسال إشعار ديسكورد.`);
      console.warn('[backup] تعذّر تسجيل الإشعار', caught);
    }
  }

  /** قراءة الملف المختار والتحقق منه قبل عرض التأكيد. */
  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        setPending(parseBackup(String(reader.result)));
      } catch (caught) {
        setPending(null);
        setError(
          caught instanceof BackupValidationError
            ? caught.message
            : 'تعذّرت قراءة الملف. تأكد أنه ملف نسخة احتياطية صالح.',
        );
      }
    };
    reader.onerror = () => setError('تعذّرت قراءة الملف.');
    reader.readAsText(file, 'utf-8');

    // تصفير الحقل حتى يمكن اختيار نفس الملف مرة أخرى
    event.target.value = '';
  }

  async function confirmImport() {
    if (!pending) return;
    await importSnapshot(pending.data);
    await logActivity('import', 'backup', 'json', 'تم استيراد نسخة احتياطية واستبدال كل البيانات');
    setPending(null);
    setSuccess('تم استيراد النسخة الاحتياطية بنجاح واستبدال كل البيانات.');
  }

  const totalRecords = Object.values(backup.stats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="النسخ الاحتياطي"
        description="صدّر كل بيانات النظام أو استعدها من ملف سابق."
      />

      {/* رسائل الحالة */}
      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <p className="text-xs leading-relaxed text-rose-300">{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-emerald-300">{success}</p>
        </div>
      ) : null}

      {/* ملخص ما سيُصدَّر */}
      <Card>
        <CardHeader
          title="محتوى النسخة الاحتياطية"
          description={`${formatNumber(totalRecords)} سجل عبر ${formatNumber(Object.keys(backup.stats).length)} مجموعة`}
          icon={DatabaseBackup}
        />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(backup.stats).map(([key, count]) => (
            <div key={key} className="rounded-lg bg-surface-2 px-3 py-2.5">
              <p className="text-[10px] text-faint">{COLLECTION_LABELS[key] ?? key}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-text">
                {formatNumber(count)}
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-accent-soft px-3 py-2.5">
            <p className="text-[10px] text-accent">الإعدادات</p>
            <p className="mt-0.5 text-lg font-bold text-accent">✓</p>
          </div>
        </div>
      </Card>

      {/* التصدير */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <FileJson className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text">تحميل جميع البيانات</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                نسخة كاملة بصيغة JSON تشمل الإدارات والرتب والموظفين والمطورين والمشاريع
                والمهام والبيانات المالية والملاحظات وسجل النشاط والإعدادات. يمكن استيرادها
                لاحقاً لاستعادة النظام كما كان تماماً.
              </p>
            </div>
          </div>

          <Button variant="primary" className="mt-4 w-full" onClick={exportJson}>
            <Download className="size-4" />
            تحميل نسخة JSON
          </Button>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-500/12 text-rose-400">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text">تقرير PDF</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                تقرير منظم وسهل القراءة يحتوي على ملخص الاستوديو وجداول بكل البيانات المهمة.
                سيُفتح التقرير في صفحة الطباعة — اختر <strong className="text-text">حفظ كـ PDF</strong>{' '}
                من قائمة الطابعة لتنزيله.
              </p>
            </div>
          </div>

          <Button variant="secondary" className="mt-4 w-full" onClick={exportPdf}>
            <FileText className="size-4" />
            إنشاء تقرير PDF
          </Button>
        </Card>
      </div>

      {/* الاستيراد */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-400">
            <Upload className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-text">استيراد نسخة احتياطية</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              اختر ملف JSON صادراً من هذا النظام لاستعادة البيانات. سيتم التحقق من الملف أولاً،
              وستظهر لك تفاصيل محتواه قبل التأكيد.
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              الاستيراد يستبدل كل البيانات الحالية. صدّر نسخة احتياطية قبل المتابعة.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileSelected}
          className="hidden"
        />

        <Button
          variant="secondary"
          className="mt-4 w-full sm:w-auto"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          اختيار ملف النسخة الاحتياطية
        </Button>
      </Card>

      {/* تأكيد الاستيراد مع تفاصيل الملف */}
      <ConfirmDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={confirmImport}
        title="تأكيد استيراد النسخة الاحتياطية"
        confirmLabel="استيراد واستبدال"
        message={
          pending
            ? `النسخة صادرة بتاريخ ${formatDateTime(pending.exportedAt)} وتحتوي على: ` +
              Object.entries(pending.stats)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => `${COLLECTION_LABELS[key] ?? key} (${count})`)
                .join('، ') +
              '. سيتم استبدال كل البيانات الحالية نهائياً.'
            : ''
        }
      />
    </div>
  );
}
