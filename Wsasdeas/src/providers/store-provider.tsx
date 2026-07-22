'use client';

/**
 * المخزن المركزي للتطبيق.
 *
 * مسؤول عن ثلاثة أشياء:
 *  1. جلسة الدخول وحالة تفعيل الحساب.
 *  2. تحميل كل البيانات المسموح بها من Supabase وحفظها في الذاكرة للعرض السريع.
 *  3. تنفيذ التعديلات وتسجيلها تلقائياً في سجل النشاط.
 *
 * ملاحظة: `can()` هنا لتحسين تجربة الاستخدام فقط (إخفاء ما لا يُسمح به).
 * الحماية الفعلية في سياسات RLS داخل قاعدة البيانات.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { hasPermission } from '@/core/domain/permissions';
import type {
  ActivityAction,
  ActivityLog,
  AppSettings,
  Bonus,
  Campaign,
  DatabaseSnapshot,
  Department,
  Member,
  Note,
  Payment,
  Penalty,
  PermissionAction,
  PermissionGrant,
  PermissionResource,
  Project,
  Promotion,
  Rank,
  Statement,
  Task,
  Transaction,
} from '@/core/domain/types';
import { EMPTY_SNAPSHOT, db } from '@/core/storage/database';
import type { CreateInput, UpdateInput } from '@/core/storage/supabase-repository';
import { supabase } from '@/lib/supabase/client';

/** يربط اسم كل مجموعة بنوع الكيان الخاص بها. */
export interface CollectionMap {
  departments: Department;
  ranks: Rank;
  members: Member;
  payments: Payment;
  promotions: Promotion;
  penalties: Penalty;
  bonuses: Bonus;
  projects: Project;
  tasks: Task;
  transactions: Transaction;
  notes: Note;
  campaigns: Campaign;
  statements: Statement;
  activity: ActivityLog;
}

export type EditableCollection = Exclude<keyof CollectionMap, 'activity'>;

/** القسم الذي تنتمي إليه كل مجموعة — لتسجيل النشاط. */
const COLLECTION_RESOURCE: Record<EditableCollection, PermissionResource> = {
  departments: 'departments',
  ranks: 'ranks',
  members: 'members',
  payments: 'finance',
  promotions: 'members',
  penalties: 'members',
  bonuses: 'members',
  projects: 'projects',
  tasks: 'tasks',
  transactions: 'finance',
  notes: 'notes',
  campaigns: 'campaigns',
  statements: 'statements',
};

/**
 * حالة الحساب:
 *  loading  — جارٍ التحقق من الجلسة
 *  guest    — لا توجد جلسة، يجب تسجيل الدخول
 *  pending  — مسجَّل لكن الحساب لم تفعّله الإدارة بعد
 *  ready    — مفعّل ويعمل بشكل طبيعي
 */
export type AuthState = 'loading' | 'guest' | 'pending' | 'ready';

interface StoreContextValue {
  data: DatabaseSnapshot;
  ready: boolean;
  authState: AuthState;
  currentMember: Member | null;
  permissions: PermissionGrant[];
  isSupreme: boolean;

  can: (resource: PermissionResource, action: PermissionAction) => boolean;

  createItem: <K extends EditableCollection>(
    collection: K,
    input: CreateInput<CollectionMap[K]>,
    summary: string,
  ) => Promise<CollectionMap[K]>;

  updateItem: <K extends EditableCollection>(
    collection: K,
    id: string,
    changes: UpdateInput<CollectionMap[K]>,
    summary: string,
  ) => Promise<void>;

  removeItem: <K extends EditableCollection>(
    collection: K,
    id: string,
    summary: string,
  ) => Promise<void>;

  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  logActivity: (
    action: ActivityAction,
    resource: PermissionResource,
    entityId: string,
    summary: string,
  ) => Promise<void>;
  logBackup: (format: string) => Promise<void>;
  importSnapshot: (snapshot: DatabaseSnapshot) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DatabaseSnapshot>(EMPTY_SNAPSHOT);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');

  /** يعيد تحميل حالة الحساب وكل البيانات المسموح بها. */
  const refresh = useCallback(async () => {
    const member = await db.getCurrentMember();

    if (!member) {
      setCurrentMember(null);
      setData(EMPTY_SNAPSHOT);
      setAuthState('guest');
      return;
    }

    setCurrentMember(member);

    if (!member.isActive) {
      // حساب بانتظار التفعيل: لا نحمّل أي بيانات (RLS يمنعها أصلاً)
      setData({ ...EMPTY_SNAPSHOT, currentMemberId: member.id });
      setAuthState('pending');
      return;
    }

    const snapshot = await db.loadSnapshot(member.id);
    setData(snapshot);
    setAuthState('ready');
  }, []);

  // متابعة الجلسة: التحميل الأول وأي تسجيل دخول أو خروج لاحق
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await refresh();
      } catch (error) {
        console.error('[store] تعذّر تحميل البيانات', error);
        if (!cancelled) setAuthState('guest');
      }
    };

    void run();

    const { data: listener } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        void run();
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  /* ------------------------------ الصلاحيات ------------------------------ */

  const currentRank = useMemo(
    () => data.ranks.find((rank) => rank.id === currentMember?.rankId) ?? null,
    [data.ranks, currentMember],
  );

  const permissions = useMemo<PermissionGrant[]>(
    () => currentRank?.permissions ?? [],
    [currentRank],
  );

  const isSupreme = useMemo(
    () =>
      data.departments.find((department) => department.id === currentMember?.departmentId)
        ?.isSupreme ?? false,
    [data.departments, currentMember],
  );

  const can = useCallback(
    (resource: PermissionResource, action: PermissionAction) => {
      if (!currentMember?.isActive) return false;
      return hasPermission(permissions, resource, action);
    },
    [permissions, currentMember],
  );

  /* ------------------------------ سجل النشاط ----------------------------- */

  const logActivity = useCallback(
    async (
      action: ActivityAction,
      resource: PermissionResource,
      entityId: string,
      summary: string,
    ) => {
      try {
        await db.activity.create({
          actorId: currentMember?.id ?? null,
          actorName: currentMember?.name ?? 'النظام',
          action,
          resource,
          entityId,
          summary,
        } as CreateInput<ActivityLog>);
      } catch (error) {
        // فشل التسجيل يجب ألا يُفشل العملية الأصلية
        console.warn('[activity] تعذّر تسجيل العملية', error);
      }
    },
    [currentMember],
  );

  /* -------------------------------- العمليات ------------------------------ */

  const repoFor = useCallback(
    <K extends EditableCollection>(collection: K) =>
      db[collection] as unknown as {
        create: (input: CreateInput<CollectionMap[K]>) => Promise<CollectionMap[K]>;
        update: (id: string, changes: UpdateInput<CollectionMap[K]>) => Promise<unknown>;
        remove: (id: string) => Promise<boolean>;
      },
    [],
  );

  const createItem = useCallback(
    async <K extends EditableCollection>(
      collection: K,
      input: CreateInput<CollectionMap[K]>,
      summary: string,
    ): Promise<CollectionMap[K]> => {
      const created = await repoFor(collection).create(input);
      await logActivity('create', COLLECTION_RESOURCE[collection], created.id, summary);
      await refresh();
      return created;
    },
    [repoFor, logActivity, refresh],
  );

  const updateItem = useCallback(
    async <K extends EditableCollection>(
      collection: K,
      id: string,
      changes: UpdateInput<CollectionMap[K]>,
      summary: string,
    ): Promise<void> => {
      await repoFor(collection).update(id, changes);
      await logActivity('update', COLLECTION_RESOURCE[collection], id, summary);
      await refresh();
    },
    [repoFor, logActivity, refresh],
  );

  const removeItem = useCallback(
    async <K extends EditableCollection>(
      collection: K,
      id: string,
      summary: string,
    ): Promise<void> => {
      // الحذف المتسلسل للسجلات المرتبطة تتكفّل به قاعدة البيانات نفسها
      await repoFor(collection).remove(id);
      await logActivity('delete', COLLECTION_RESOURCE[collection], id, summary);
      await refresh();
    },
    [repoFor, logActivity, refresh],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...data.settings, ...patch };
      // تحديث فوري للواجهة ثم الحفظ، حتى لا يتأخر تبديل الوضع الليلي
      setData((previous) => ({ ...previous, settings: next }));
      try {
        await db.saveSettings(next);
      } catch (error) {
        console.warn('[settings] تعذّر حفظ الإعدادات', error);
      }
    },
    [data.settings],
  );

  const logBackup = useCallback(
    async (format: string) => {
      await db.logBackup(currentMember, format);
    },
    [currentMember],
  );

  const importSnapshot = useCallback(
    async (snapshot: DatabaseSnapshot) => {
      await db.restoreSnapshot(snapshot);
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setCurrentMember(null);
    setData(EMPTY_SNAPSHOT);
    setAuthState('guest');
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      data,
      ready: authState === 'ready',
      authState,
      currentMember,
      permissions,
      isSupreme,
      can,
      createItem,
      updateItem,
      removeItem,
      updateSettings,
      logActivity,
      logBackup,
      importSnapshot,
      signOut,
      reload: refresh,
    }),
    [
      data,
      authState,
      currentMember,
      permissions,
      isSupreme,
      can,
      createItem,
      updateItem,
      removeItem,
      updateSettings,
      logActivity,
      logBackup,
      importSnapshot,
      signOut,
      refresh,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** الوصول إلى المخزن من أي مكوّن. */
export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore يجب أن يُستخدم داخل <StoreProvider>');
  }
  return context;
}
