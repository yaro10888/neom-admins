'use client';

/** حارس الصلاحيات — يمنع عرض محتوى أي قسم لمن لا يملك صلاحية رؤيته. */

import { Lock } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { RESOURCES } from '@/core/domain/permissions';
import type { PermissionResource } from '@/core/domain/types';
import { useStore } from '@/providers/store-provider';
import { Button, Card, EmptyState } from '@/components/ui/primitives';

export function RequirePermission({
  resource,
  children,
}: {
  resource: PermissionResource;
  children: ReactNode;
}) {
  const { can, currentMember, data } = useStore();

  if (can(resource, 'view')) {
    return <>{children}</>;
  }

  const label = RESOURCES.find((r) => r.key === resource)?.label ?? resource;
  const rank = data.ranks.find((r) => r.id === currentMember?.rankId);

  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        icon={Lock}
        title={`لا تملك صلاحية الوصول إلى «${label}»`}
        description={
          rank
            ? `رتبتك الحالية «${rank.name}» لا تتضمن صلاحية عرض هذا القسم. تواصل مع الإدارة العليا لمنحك الصلاحية.`
            : 'لم يتم تحديد رتبة لحسابك الحالي.'
        }
        action={
          <Link href="/">
            <Button variant="secondary" size="sm">
              العودة للرئيسية
            </Button>
          </Link>
        }
      />
    </Card>
  );
}
