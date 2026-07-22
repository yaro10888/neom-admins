/**
 * طبقة قاعدة البيانات — Supabase.
 *
 * تجمع كل المستودعات في مكان واحد وتوفّر عمليات على مستوى النظام.
 * الصلاحيات لا تُفرض هنا بل داخل Postgres عبر RLS، لذا حتى لو استُدعيت
 * هذه الدوال من خارج الواجهة فلن تُرجع إلا ما تسمح به رتبة المستخدم.
 */

import { supabase } from '@/lib/supabase/client';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import type {
  ActivityLog,
  AppSettings,
  BackupLog,
  Bonus,
  Campaign,
  DatabaseSnapshot,
  Department,
  Member,
  Note,
  Payment,
  Penalty,
  Project,
  Promotion,
  Rank,
  Statement,
  Task,
  Transaction,
} from '../domain/types';
import { entityToRow, rowToEntity } from '../utils/case';
import { SupabaseRepository, describeError } from './supabase-repository';

/** بيانات فارغة تُستخدم قبل اكتمال التحميل أو عند عدم وجود جلسة. */
export const EMPTY_SNAPSHOT: DatabaseSnapshot = {
  departments: [],
  ranks: [],
  members: [],
  payments: [],
  promotions: [],
  penalties: [],
  bonuses: [],
  projects: [],
  tasks: [],
  transactions: [],
  notes: [],
  campaigns: [],
  activity: [],
  statements: [],
  settings: DEFAULT_SETTINGS,
  currentMemberId: null,
};

export class Database {
  readonly departments = new SupabaseRepository<Department>('departments');
  readonly ranks = new SupabaseRepository<Rank>('ranks');
  readonly members = new SupabaseRepository<Member>('members');
  readonly payments = new SupabaseRepository<Payment>('payments');
  readonly promotions = new SupabaseRepository<Promotion>('promotions');
  readonly penalties = new SupabaseRepository<Penalty>('penalties');
  readonly bonuses = new SupabaseRepository<Bonus>('bonuses');
  readonly projects = new SupabaseRepository<Project>('projects');
  readonly tasks = new SupabaseRepository<Task>('tasks');
  readonly transactions = new SupabaseRepository<Transaction>('transactions');
  readonly notes = new SupabaseRepository<Note>('notes');
  readonly campaigns = new SupabaseRepository<Campaign>('campaigns');
  readonly activity = new SupabaseRepository<ActivityLog>('activity');
  readonly statements = new SupabaseRepository<Statement>('statements');
  readonly backupLogs = new SupabaseRepository<BackupLog>('backup_logs');

  /* ------------------------------- الإعدادات ------------------------------- */

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase()
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // قبل التفعيل لا يستطيع المستخدم قراءة الإعدادات — نستخدم الافتراضيات
    if (error || !data) return DEFAULT_SETTINGS;

    const row = rowToEntity<Partial<AppSettings>>(data);
    return { ...DEFAULT_SETTINGS, ...row };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const { error } = await supabase()
      .from('app_settings')
      .update(entityToRow(settings as unknown as Record<string, unknown>))
      .eq('id', 1);

    if (error) throw new Error(describeError(error, 'تعذّر حفظ الإعدادات'));
  }

  /* --------------------------- المستخدم الحالي --------------------------- */

  /**
   * يعيد سجل العضو المرتبط بالمستخدم المسجَّل دخوله.
   * سياسة RLS تسمح لكل مستخدم بقراءة سجله الخاص دائماً، حتى قبل التفعيل،
   * حتى يستطيع النظام معرفة حالته وعرض شاشة الانتظار.
   */
  async getCurrentMember(): Promise<Member | null> {
    const client = supabase();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return null;

    const { data, error } = await client
      .from('members')
      .select('*')
      .eq('auth_user_id', auth.user.id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToEntity<Member>(data);
  }

  /* ------------------------------ تحميل شامل ------------------------------ */

  /**
   * يقرأ كل ما يستطيع المستخدم رؤيته دفعة واحدة.
   * الجداول الممنوعة عليه تعود فارغة بفضل RLS، دون أي خطأ.
   */
  async loadSnapshot(currentMemberId: string | null): Promise<DatabaseSnapshot> {
    const [
      departments,
      ranks,
      members,
      payments,
      promotions,
      penalties,
      bonuses,
      projects,
      tasks,
      transactions,
      notes,
      campaigns,
      activity,
      statements,
      settings,
    ] = await Promise.all([
      this.departments.list(),
      this.ranks.list(),
      this.members.list(),
      this.payments.list(),
      this.promotions.list(),
      this.penalties.list(),
      this.bonuses.list(),
      this.projects.list(),
      this.tasks.list(),
      this.transactions.list(),
      this.notes.list(),
      this.campaigns.list(),
      this.activity.list(),
      this.statements.list(),
      this.getSettings(),
    ]);

    return {
      departments,
      ranks,
      members,
      payments,
      promotions,
      penalties,
      bonuses,
      projects,
      tasks,
      transactions,
      notes,
      campaigns,
      activity,
      statements,
      settings,
      currentMemberId,
    };
  }

  /** يستبدل كل بيانات النظام — يُستخدم عند استيراد نسخة احتياطية. */
  async restoreSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
    // الترتيب مهم: الجداول التابعة أولاً ثم الأصلية، احتراماً للمفاتيح الأجنبية.
    await this.notes.replaceAll(snapshot.notes);
    await this.payments.replaceAll(snapshot.payments);
    await this.promotions.replaceAll(snapshot.promotions);
    await this.penalties.replaceAll(snapshot.penalties);
    await this.bonuses.replaceAll(snapshot.bonuses);
    await this.tasks.replaceAll(snapshot.tasks);
    await this.transactions.replaceAll(snapshot.transactions);
    await this.projects.replaceAll(snapshot.projects);
    await this.campaigns.replaceAll(snapshot.campaigns);
    await this.activity.replaceAll(snapshot.activity);
    await this.saveSettings(snapshot.settings);
  }

  /** يسجّل عملية نسخ احتياطي — وهذا وحده يُطلق إشعار ديسكورد من قاعدة البيانات. */
  async logBackup(member: Member | null, format: string): Promise<void> {
    const { error } = await supabase().from('backup_logs').insert({
      actor_id: member?.id ?? null,
      actor_name: member?.name ?? 'غير معروف',
      discord_username: member?.discordUsername || '—',
      format,
    });

    if (error) throw new Error(describeError(error, 'تعذّر تسجيل النسخة الاحتياطية'));
  }
}

export const db = new Database();
