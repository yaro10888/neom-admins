'use client';

/** صفحة الموظفين — كل أعضاء الاستوديو في كل الإدارات. */

import { MembersView } from '@/components/features/members-view';
import { RequirePermission } from '@/components/layout/guard';

export default function MembersPage() {
  return (
    <RequirePermission resource="members">
      <MembersView
        resource="members"
        title="الموظفون"
        description="كل أعضاء الاستوديو مع رتبهم وحالتهم ومستحقاتهم. اضغط على أي عضو لعرض ملفه الكامل."
      />
    </RequirePermission>
  );
}
