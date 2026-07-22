'use client';

/** سجل النشاط — كل عملية تمت داخل النظام مع صاحبها ووقتها. */

import { Activity, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RESOURCES } from '@/core/domain/permissions';
import type { ActivityAction } from '@/core/domain/types';
import { formatDateTime, formatNumber, matchesSearch, formatRelative } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { RequirePermission } from '@/components/layout/guard';
import { SearchInput, Select } from '@/components/ui/form';
import { Avatar, Badge, Card, EmptyState, PageHeader } from '@/components/ui/primitives';

const ACTION_LABEL: Record<ActivityAction, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  import: 'استيراد',
  export: 'تصدير',
  login: 'دخول',
};

const ACTION_STYLE: Record<ActivityAction, string> = {
  create: 'bg-emerald-500/15 text-emerald-400',
  update: 'bg-sky-500/15 text-sky-400',
  delete: 'bg-rose-500/15 text-rose-400',
  import: 'bg-violet-500/15 text-violet-400',
  export: 'bg-amber-500/15 text-amber-400',
  login: 'bg-slate-500/15 text-slate-300',
};

export default function ActivityPage() {
  return (
    <RequirePermission resource="activity">
      <ActivityContent />
    </RequirePermission>
  );
}

function ActivityContent() {
  const { data } = useStore();

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [resource, setResource] = useState('all');
  const [actor, setActor] = useState('all');

  const entries = useMemo(
    () =>
      data.activity
        .filter((entry) => action === 'all' || entry.action === action)
        .filter((entry) => resource === 'all' || entry.resource === resource)
        .filter((entry) => actor === 'all' || entry.actorId === actor)
        .filter(
          (entry) =>
            matchesSearch(entry.summary, search) || matchesSearch(entry.actorName, search),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.activity, action, resource, actor, search],
  );

  /** تجميع السجل حسب اليوم لعرض أوضح. */
  const byDay = useMemo(() => {
    const map = new Map<string, typeof entries>();
    entries.forEach((entry) => {
      const day = entry.createdAt.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(entry);
      map.set(day, list);
    });
    return [...map.entries()];
  }, [entries]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    data.activity.forEach((entry) => map.set(entry.actorId, entry.actorName));
    return [...map.entries()];
  }, [data.activity]);

  return (
    <div className="animate-[var(--animate-fade-up)] space-y-6">
      <PageHeader
        title="سجل النشاط"
        description="كل إضافة أو تعديل أو حذف داخل النظام تُسجَّل هنا تلقائياً مع الوقت والشخص."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث في السجل…"
          className="w-full sm:w-64"
        />

        <Select value={action} onChange={(event) => setAction(event.target.value)} className="w-auto">
          <option value="all">كل العمليات</option>
          {Object.entries(ACTION_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={resource}
          onChange={(event) => setResource(event.target.value)}
          className="w-auto"
        >
          <option value="all">كل الأقسام</option>
          {RESOURCES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>

        <Select value={actor} onChange={(event) => setActor(event.target.value)} className="w-auto">
          <option value="all">كل الأشخاص</option>
          {actors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>

        <span className="mr-auto text-xs text-faint">{formatNumber(entries.length)} عملية</span>
      </div>

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="لا توجد عمليات مطابقة"
            description="السجل يمتلئ تلقائياً مع كل تعديل تقوم به داخل النظام."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {byDay.map(([day, dayEntries]) => (
            <Card key={day}>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <p className="text-xs font-semibold text-text">
                  {new Intl.DateTimeFormat('ar-SA', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(day))}
                </p>
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">
                  {formatNumber(dayEntries.length)}
                </span>
              </div>

              <ul className="divide-y divide-border/60">
                {dayEntries.map((entry) => {
                  const member = data.members.find((item) => item.id === entry.actorId);
                  const resourceLabel =
                    RESOURCES.find((item) => item.key === entry.resource)?.label ?? entry.resource;

                  return (
                    <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                      {member ? (
                        <Avatar name={member.name} color={member.avatarColor} size="sm" />
                      ) : (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-faint">
                          <Activity className="size-3.5" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={ACTION_STYLE[entry.action]}>
                            {entry.action === 'delete' ? (
                              <Trash2 className="ml-1 size-2.5" />
                            ) : null}
                            {ACTION_LABEL[entry.action]}
                          </Badge>
                          <Badge>{resourceLabel}</Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-text">{entry.summary}</p>
                        <p className="mt-0.5 text-[10px] text-faint">
                          بواسطة {entry.actorName} — {formatDateTime(entry.createdAt)}
                        </p>
                      </div>

                      <span className="shrink-0 text-[10px] whitespace-nowrap text-faint">
                        {formatRelative(entry.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
