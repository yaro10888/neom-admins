'use client';

/** شاشة انتظار التفعيل — تظهر للحساب الجديد حتى تفعّله الإدارة. */

import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { formatDate } from '@/core/utils/format';
import { useStore } from '@/providers/store-provider';
import { Avatar, Button, Card } from '@/components/ui/primitives';

export function PendingScreen() {
  const { currentMember, signOut, reload } = useStore();
  const [checking, setChecking] = useState(false);

  async function recheck() {
    setChecking(true);
    try {
      await reload();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md p-7 text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-500/12 text-amber-400">
          <Clock className="size-7" />
        </span>

        <h1 className="text-lg font-bold text-text">حسابك بانتظار التفعيل</h1>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          تم إنشاء حسابك بنجاح. يرجى انتظار موافقة الإدارة على تفعيله. بمجرد التفعيل ستظهر لك
          كل الأقسام المسموح بها حسب رتبتك.
        </p>

        {currentMember ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-3.5 text-right">
            <Avatar
              name={currentMember.name}
              color={currentMember.avatarColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{currentMember.name}</p>
              <p className="truncate text-[11px] text-faint">
                {currentMember.email ?? ''}
              </p>
              <p className="mt-0.5 text-[11px] text-faint">
                سُجّل في {formatDate(currentMember.createdAt)}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex gap-2">
          <Button variant="primary" className="flex-1" onClick={recheck} disabled={checking}>
            <RefreshCw className={checking ? 'size-4 animate-spin' : 'size-4'} />
            {checking ? 'جارٍ التحقق…' : 'تحقّق من التفعيل'}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            خروج
          </Button>
        </div>
      </Card>
    </div>
  );
}
