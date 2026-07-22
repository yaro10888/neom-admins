'use client';

/** إدارة الدعاية — الحملات الإعلانية وميزانياتها ونتائجها. */

import {
  Eye,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { CAMPAIGN_STATUS } from '@/core/domain/defaults';
import type { Campaign, CampaignStatus } from '@/core/domain/types';
import { campaignSpendRate } from '@/core/services/selectors';
import { cn, formatCompact, formatDate, formatMoney } from '@/core/utils/format';
import { todayIso } from '@/core/utils/id';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { Field, FormGrid, Input, Select, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Progress,
  StatCard,
} from '@/components/ui/primitives';

interface CampaignForm {
  name: string;
  platform: string;
  budget: number;
  spent: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  notes: string;
}

const BLANK: CampaignForm = {
  name: '',
  platform: 'Roblox Ads',
  budget: 0,
  spent: 0,
  status: 'planned',
  startDate: todayIso(),
  endDate: todayIso(),
  impressions: 0,
  clicks: 0,
  conversions: 0,
  notes: '',
};

export default function CampaignsPage() {
  return (
    <RequirePermission resource="campaigns">
      <CampaignsContent />
    </RequirePermission>
  );
}

function CampaignsContent() {
  const { data, can, createItem, updateItem, removeItem } = useStore();
  const currency = data.settings.currency;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(BLANK);

  const totals = useMemo(() => {
    const budget = data.campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
    const spent = data.campaigns.reduce((sum, campaign) => sum + campaign.spent, 0);
    const conversions = data.campaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
    const clicks = data.campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
    const impressions = data.campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);

    return {
      budget,
      spent,
      conversions,
      clicks,
      impressions,
      // تكلفة الحصول على لاعب واحد
      costPerConversion: conversions > 0 ? spent / conversions : 0,
      clickRate: impressions > 0 ? (clicks / impressions) * 100 : 0,
    };
  }, [data.campaigns]);

  function openCreate() {
    setForm(BLANK);
    setCreating(true);
  }

  function openEdit(campaign: Campaign) {
    setForm({
      name: campaign.name,
      platform: campaign.platform,
      budget: campaign.budget,
      spent: campaign.spent,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      notes: campaign.notes,
    });
    setEditing(campaign);
  }

  async function save() {
    if (!form.name.trim()) return;

    if (editing) {
      await updateItem('campaigns', editing.id, { ...form }, `تم تعديل حملة «${form.name}»`);
      setEditing(null);
    } else {
      await createItem('campaigns', { ...form }, `تم إنشاء حملة إعلانية «${form.name}»`);
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await removeItem('campaigns', deleting.id, `تم حذف حملة «${deleting.name}»`);
    setDeleting(null);
  }

  const open = creating || editing !== null;

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="إدارة الدعاية"
        description="الحملات الإعلانية مع ميزانياتها وحالتها ونتائجها الفعلية."
        action={
          can('campaigns', 'create') ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-4" />
              حملة جديدة
            </Button>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="إجمالي الميزانيات"
          value={formatMoney(totals.budget, currency)}
          icon={Wallet}
        />
        <StatCard
          label="المصروف فعلياً"
          value={formatMoney(totals.spent, currency)}
          hint={`${Math.round(totals.budget > 0 ? (totals.spent / totals.budget) * 100 : 0)}% من الميزانية`}
          icon={Target}
          tone="warning"
        />
        <StatCard
          label="لاعبون جدد"
          value={formatCompact(totals.conversions)}
          hint={`تكلفة اللاعب ${formatMoney(totals.costPerConversion, currency)}`}
          icon={MousePointerClick}
          tone="success"
        />
        <StatCard
          label="مرات الظهور"
          value={formatCompact(totals.impressions)}
          hint={`نسبة النقر ${totals.clickRate.toFixed(1)}%`}
          icon={Eye}
        />
      </section>

      {data.campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="لا توجد حملات"
            description="ابدأ بإنشاء أول حملة إعلانية."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.campaigns.map((campaign) => {
            const status = CAMPAIGN_STATUS[campaign.status];
            const spendRate = campaignSpendRate(campaign);
            const overBudget = campaign.spent > campaign.budget;
            const conversionRate =
              campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

            return (
              <Card key={campaign.id} className="group card-gradient p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text">{campaign.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge className={status.className}>{status.label}</Badge>
                      <Badge>{campaign.platform}</Badge>
                      {overBudget ? (
                        <Badge className="bg-rose-500/15 text-rose-400">تجاوزت الميزانية</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {can('campaigns', 'edit') ? (
                      <button
                        onClick={() => openEdit(campaign)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
                        aria-label={`تعديل ${campaign.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}
                    {can('campaigns', 'delete') ? (
                      <button
                        onClick={() => setDeleting(campaign)}
                        className="grid size-7 place-items-center rounded-md text-muted hover:bg-rose-500/15 hover:text-rose-400"
                        aria-label={`حذف ${campaign.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* استهلاك الميزانية */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {formatMoney(campaign.spent, currency)} من{' '}
                      {formatMoney(campaign.budget, currency)}
                    </span>
                    <span className={cn('font-medium', overBudget ? 'text-rose-400' : 'text-text')}>
                      {Math.round(spendRate)}%
                    </span>
                  </div>
                  <Progress
                    value={spendRate}
                    color={overBudget ? '#f43f5e' : spendRate > 80 ? '#f59e0b' : undefined}
                  />
                </div>

                {/* النتائج */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <ResultTile
                    label="ظهور"
                    value={formatCompact(campaign.impressions)}
                    icon={Eye}
                  />
                  <ResultTile
                    label="نقرات"
                    value={formatCompact(campaign.clicks)}
                    icon={MousePointerClick}
                  />
                  <ResultTile
                    label="لاعبون"
                    value={formatCompact(campaign.conversions)}
                    icon={Target}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
                  <span>
                    {formatDate(campaign.startDate)} ← {formatDate(campaign.endDate)}
                  </span>
                  <span>نسبة التحويل {conversionRate.toFixed(1)}%</span>
                </div>

                {campaign.notes ? (
                  <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-[11px] leading-relaxed text-muted">
                    {campaign.notes}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج الحملة */}
      <Modal
        open={open}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل «${editing.name}»` : 'حملة إعلانية جديدة'}
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
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label="اسم الحملة" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="مثال: حملة إطلاق اللعبة"
              />
            </Field>

            <Field label="المنصة">
              <Input
                value={form.platform}
                onChange={(event) => setForm({ ...form, platform: event.target.value })}
                list="campaign-platforms"
              />
              <datalist id="campaign-platforms">
                <option value="Roblox Ads" />
                <option value="يوتيوب" />
                <option value="تيك توك" />
                <option value="تويتر" />
                <option value="ديسكورد" />
              </datalist>
            </Field>

            <Field label="الميزانية">
              <Input
                type="number"
                min={0}
                value={form.budget}
                onChange={(event) => setForm({ ...form, budget: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label="المصروف حتى الآن">
              <Input
                type="number"
                min={0}
                value={form.spent}
                onChange={(event) => setForm({ ...form, spent: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label="الحالة">
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as CampaignStatus })
                }
              >
                {Object.entries(CAMPAIGN_STATUS).map(([key, meta]) => (
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

            <Field label="تاريخ النهاية">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </Field>

            <Field label="مرات الظهور">
              <Input
                type="number"
                min={0}
                value={form.impressions}
                onChange={(event) =>
                  setForm({ ...form, impressions: Number(event.target.value) || 0 })
                }
              />
            </Field>

            <Field label="النقرات">
              <Input
                type="number"
                min={0}
                value={form.clicks}
                onChange={(event) => setForm({ ...form, clicks: Number(event.target.value) || 0 })}
              />
            </Field>

            <Field label="لاعبون جدد">
              <Input
                type="number"
                min={0}
                value={form.conversions}
                onChange={(event) =>
                  setForm({ ...form, conversions: Number(event.target.value) || 0 })
                }
              />
            </Field>
          </FormGrid>

          <Field label="ملاحظات">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="ملاحظات عن أداء الحملة"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="حذف الحملة"
        message={`سيتم حذف «${deleting?.name}» وكل نتائجها المسجلة.`}
      />
    </div>
  );
}

function ResultTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-2 text-center">
      <Icon className="mx-auto size-3.5 text-faint" />
      <p className="mt-1 truncate text-xs font-semibold tabular-nums text-text">{value}</p>
      <p className="text-[10px] text-faint">{label}</p>
    </div>
  );
}
