'use client';

/** إعدادات النظام — الهوية، المظهر، وإدارة الهيكل التنظيمي. */

import {
  Building2,
  Check,
  Database,
  Moon,
  Palette,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { ACCENT_PRESETS } from '@/core/domain/defaults';
import { cn, formatNumber } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, Input } from '@/components/ui/form';
import { Card, CardHeader, PageHeader } from '@/components/ui/primitives';

export default function SettingsPage() {
  return (
    <RequirePermission resource="settings">
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const { data, can, updateSettings } = useStore();
  const settings = data.settings;

  const canEdit = can('settings', 'edit');

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="الإعدادات"
        description="تحكّم في هوية النظام ومظهره وهيكله التنظيمي."
      />

      {/* هوية الاستوديو */}
      <Card>
        <CardHeader
          title="هوية الاستوديو"
          description="تظهر في الشريط الجانبي وفي التقارير المصدّرة"
          icon={SettingsIcon}
        />
        <div className="p-5">
          <FormGrid>
            <Field label="اسم الاستوديو">
              <Input
                value={settings.studioName}
                onChange={(event) => updateSettings({ studioName: event.target.value })}
                disabled={!canEdit}
              />
            </Field>

            <Field label="رمز العملة" hint="يظهر بجانب كل المبالغ في النظام">
              <Input
                value={settings.currency}
                onChange={(event) => updateSettings({ currency: event.target.value })}
                disabled={!canEdit}
                placeholder="ر.س / $ / Robux"
              />
            </Field>
          </FormGrid>
        </div>
      </Card>

      {/* المظهر */}
      <Card>
        <CardHeader title="المظهر" description="الوضع الليلي والألوان والحركات" icon={Palette} />
        <div className="space-y-6 p-5">
          {/* الوضع */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">وضع العرض</p>
            <div className="flex gap-2">
              <ThemeOption
                active={settings.theme === 'dark'}
                onClick={() => updateSettings({ theme: 'dark' })}
                disabled={!canEdit}
                icon={Moon}
                label="ليلي"
              />
              <ThemeOption
                active={settings.theme === 'light'}
                onClick={() => updateSettings({ theme: 'light' })}
                disabled={!canEdit}
                icon={Sun}
                label="فاتح"
              />
            </div>
          </div>

          {/* لون التمييز */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">لون التمييز</p>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateSettings({ accentColor: preset.value })}
                  disabled={!canEdit}
                  className={cn(
                    'grid size-10 place-items-center rounded-xl transition-transform hover:scale-105 disabled:opacity-50',
                    settings.accentColor === preset.value &&
                      'ring-2 ring-white/70 ring-offset-2 ring-offset-[var(--surface)]',
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  aria-label={preset.name}
                >
                  {settings.accentColor === preset.value ? (
                    <Check className="size-4 text-white" />
                  ) : null}
                </button>
              ))}

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted transition-colors hover:border-border-strong">
                لون مخصص
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) => updateSettings({ accentColor: event.target.value })}
                  disabled={!canEdit}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>

          {/* الكثافة */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted">كثافة الواجهة</p>
            <div className="flex gap-2">
              <ThemeOption
                active={settings.density === 'comfortable'}
                onClick={() => updateSettings({ density: 'comfortable' })}
                disabled={!canEdit}
                label="مريحة"
              />
              <ThemeOption
                active={settings.density === 'compact'}
                onClick={() => updateSettings({ density: 'compact' })}
                disabled={!canEdit}
                label="مضغوطة"
              />
            </div>
          </div>

          {/* الحركات */}
          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-2 p-3.5 transition-colors hover:border-border-strong',
              !canEdit && 'pointer-events-none opacity-50',
            )}
          >
            <input
              type="checkbox"
              checked={settings.animations}
              onChange={(event) => updateSettings({ animations: event.target.checked })}
              className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text">
                <Zap className="size-3.5" />
                تفعيل الحركات والانتقالات
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">
                عطّلها إن كنت تفضّل واجهة ثابتة أو تعمل على جهاز بطيء.
              </span>
            </span>
          </label>
        </div>
      </Card>

      {/* الهيكل التنظيمي */}
      <Card>
        <CardHeader
          title="الهيكل التنظيمي"
          description="إدارة الإدارات والرتب والصلاحيات"
          icon={Building2}
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <Link
            href="/departments"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4 transition-all hover:border-border-strong hover:bg-surface-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Building2 className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text">إدارة الإدارات</span>
              <span className="block text-[11px] text-muted">
                {formatNumber(data.departments.length)} إدارة — أضف أو عدّل أو احذف
              </span>
            </span>
          </Link>

          <Link
            href="/ranks"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4 transition-all hover:border-border-strong hover:bg-surface-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Shield className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text">الرتب والصلاحيات</span>
              <span className="block text-[11px] text-muted">
                {formatNumber(data.ranks.length)} رتبة — تحكّم كامل في الصلاحيات
              </span>
            </span>
          </Link>
        </div>
      </Card>

      {/* تخزين البيانات */}
      <Card>
        <CardHeader title="تخزين البيانات" icon={Database} />
        <div className="p-5">
          <p className="text-xs leading-relaxed text-muted">
            جميع البيانات محفوظة في قاعدة بيانات Supabase ومشتركة بين كل أعضاء الاستوديو —
            ما تكتبه هنا يراه البقية فوراً حسب صلاحياتهم.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            الصلاحيات مفروضة داخل قاعدة البيانات نفسها (Row Level Security)، لذا لا يستطيع
            أحد تجاوز الواجهة للوصول إلى بيانات لا تسمح بها رتبته.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            ننصح بتصدير نسخة احتياطية دورية من{' '}
            <Link href="/backup" className="text-accent hover:underline">
              صفحة النسخ الاحتياطي
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}

function ThemeOption({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon?: typeof Moon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium transition-all disabled:opacity-50',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface-2 text-muted hover:border-border-strong hover:text-text',
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
    </button>
  );
}
