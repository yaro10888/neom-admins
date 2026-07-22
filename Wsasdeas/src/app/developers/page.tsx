'use client';

/** صفحة المطورين — نفس عرض الأعضاء لكن مقصوراً على إدارات التطوير. */

import { useMemo } from 'react';

import { developerDepartmentIds } from '@/core/services/selectors';
import { useStore } from '@/providers/store-provider';
import { MembersView } from '@/components/features/members-view';
import { RequirePermission } from '@/components/layout/guard';

export default function DevelopersPage() {
  const { data } = useStore();

  const departmentIds = useMemo(
    () => developerDepartmentIds(data.departments),
    [data.departments],
  );

  return (
    <RequirePermission resource="developers">
      <MembersView
        resource="developers"
        title="إدارة المطورين"
        description="المطورون مع تخصصاتهم ونسبة إنجاز مهامهم ومستحقاتهم المالية."
        departmentFilter={departmentIds}
      />
    </RequirePermission>
  );
}
