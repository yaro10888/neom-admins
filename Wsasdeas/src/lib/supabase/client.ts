/**
 * عميل Supabase للمتصفح.
 *
 * يُستخدم `createBrowserClient` من `@supabase/ssr` لأنه يدير جلسة الدخول
 * في الكوكيز ويجدّد الرمز تلقائياً.
 *
 * المفتاح المستخدم هنا علني بطبيعته (publishable) — الحماية الحقيقية ليست
 * في إخفائه بل في سياسات RLS داخل قاعدة البيانات.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cached: SupabaseClient | null = null;

/** يعيد نسخة واحدة مشتركة من العميل. */
export function supabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'إعدادات Supabase ناقصة. تأكد من وجود NEXT_PUBLIC_SUPABASE_URL و ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY في ملف .env.local',
    );
  }

  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return cached;
}

/** هل تم ضبط إعدادات Supabase؟ تُستخدم لعرض رسالة واضحة بدل انهيار الصفحة. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
