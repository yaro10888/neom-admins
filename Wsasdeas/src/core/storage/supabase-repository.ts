/**
 * مستودع عام يعمل فوق Supabase.
 *
 * يحافظ على نفس واجهة المستودع القديم (list / getById / create / update /
 * remove) — لهذا لم تحتج صفحات التطبيق أي تعديل عند الانتقال من التخزين
 * المحلي إلى قاعدة بيانات حقيقية.
 *
 * ملاحظة مهمة: أي خطأ صلاحيات هنا مصدره سياسات RLS في قاعدة البيانات،
 * وهو سلوك مقصود — الواجهة ليست خط الدفاع، قاعدة البيانات هي.
 */

import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';
import { entityToRow, rowToEntity } from '../utils/case';
import type { BaseEntity } from '../domain/types';

/**
 * حقول تولّدها قاعدة البيانات ولا تُرسل عند الإنشاء.
 * `number` هو رقم البيان التسلسلي (GENERATED ALWAYS) — إرساله يسبب خطأ في Postgres.
 */
type GeneratedField = 'number';

export type CreateInput<T extends BaseEntity> = Omit<T, keyof BaseEntity | GeneratedField> &
  Partial<Pick<T, 'id'>>;

export type UpdateInput<T extends BaseEntity> = Partial<Omit<T, keyof BaseEntity>>;

/** خطأ قاعدة بيانات برسالة عربية مفهومة. */
export class DataError extends Error {
  constructor(
    message: string,
    readonly cause?: PostgrestError | null,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

/** يحوّل أخطاء Postgres إلى رسائل واضحة للمستخدم. */
export function describeError(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;

  // 42501 = رفض بسبب RLS، أي أن رتبة المستخدم لا تسمح بهذه العملية
  if (error.code === '42501') {
    return 'رتبتك الحالية لا تملك صلاحية تنفيذ هذه العملية.';
  }
  // 23505 = تكرار قيمة فريدة
  if (error.code === '23505') {
    return 'هذه البيانات مسجّلة مسبقاً لعضو آخر.';
  }
  if (error.message?.includes('PROTECTED_ACCOUNT')) {
    return 'هذا الحساب محمي ولا يمكن تعديله أو حذفه.';
  }
  return error.message || fallback;
}

export class SupabaseRepository<T extends BaseEntity> {
  constructor(private readonly table: string) {}

  /** يعيد كل الصفوف التي تسمح بها صلاحيات المستخدم الحالي. */
  async list(): Promise<T[]> {
    const { data, error } = await supabase()
      .from(this.table)
      .select('*')
      .order('created_at', { ascending: false });

    // رفض الصلاحيات يعيد قائمة فارغة بدل إسقاط الصفحة —
    // الواجهة تُخفي القسم أصلاً لمن لا يملك صلاحيته.
    if (error) {
      if (error.code === '42501') return [];
      throw new DataError(describeError(error, `تعذّر تحميل ${this.table}`), error);
    }

    return (data ?? []).map((row) => rowToEntity<T>(row));
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase()
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new DataError(describeError(error, 'تعذّر تحميل السجل'), error);
    return data ? rowToEntity<T>(data) : null;
  }

  async create(input: CreateInput<T>): Promise<T> {
    const { data, error } = await supabase()
      .from(this.table)
      .insert(entityToRow(input as Record<string, unknown>))
      .select()
      .single();

    if (error) throw new DataError(describeError(error, 'تعذّرت الإضافة'), error);
    return rowToEntity<T>(data);
  }

  async update(id: string, changes: UpdateInput<T>): Promise<T | null> {
    const { data, error } = await supabase()
      .from(this.table)
      .update(entityToRow(changes as Record<string, unknown>))
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new DataError(describeError(error, 'تعذّر التعديل'), error);
    return data ? rowToEntity<T>(data) : null;
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await supabase().from(this.table).delete().eq('id', id);
    if (error) throw new DataError(describeError(error, 'تعذّر الحذف'), error);
    return true;
  }

  /**
   * حذف حسب شرط.
   * لم نعد نحتاجه غالباً لأن قاعدة البيانات تتكفّل بالحذف المتسلسل
   * عبر `on delete cascade`، لكنه يبقى متاحاً للحالات الخاصة.
   */
  async removeWhere(column: string, value: string): Promise<number> {
    const { error, count } = await supabase()
      .from(this.table)
      .delete({ count: 'exact' })
      .eq(column, value);

    if (error) throw new DataError(describeError(error, 'تعذّر الحذف'), error);
    return count ?? 0;
  }

  /** يستبدل محتوى الجدول بالكامل — يُستخدم عند استيراد نسخة احتياطية. */
  async replaceAll(items: T[]): Promise<void> {
    const client = supabase();

    const { error: deleteError } = await client
      .from(this.table)
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      throw new DataError(describeError(deleteError, 'تعذّر مسح البيانات القديمة'), deleteError);
    }

    if (items.length === 0) return;

    const { error } = await client
      .from(this.table)
      .insert(items.map((item) => entityToRow(item as unknown as Record<string, unknown>)));

    if (error) throw new DataError(describeError(error, 'تعذّر استيراد البيانات'), error);
  }
}
