-- ============================================================================
--  إلغاء الحاجة لتأكيد البريد الإلكتروني
-- ============================================================================
--  المشكلة: Supabase يفعّل "Confirm email" افتراضياً في كل مشروع جديد، فيمنع
--  أي مستخدم من الدخول حتى يضغط رابطاً في بريده.
--
--  هذا لا يناسب النظام هنا، لأن لدينا نظام تفعيل حسابات خاصاً بنا:
--  الإدارة هي من تعتمد الحساب، وهذا أقوى وأدق من تأكيد البريد.
--
--  شغّل هذا الملف في:  Supabase → SQL Editor → New query → Run
--  قابل لإعادة التشغيل بأمان.
-- ============================================================================

-- 1) تأكيد كل الحسابات الموجودة حالياً --------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 2) تأكيد أي حساب جديد تلقائياً لحظة إنشائه --------------------------------
--    ملاحظة: نضبط email_confirmed_at فقط.
--    العمود confirmed_at محسوب تلقائياً من قِبل Supabase ولا يجوز الكتابة فيه.
create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm_email on auth.users;
create trigger trg_auto_confirm_email
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- ============================================================================
--  بعد تشغيل هذا الملف:
--   • كل حساب جديد يستطيع تسجيل الدخول فوراً بلا رسالة بريد.
--   • يبقى محكوماً بتفعيل الإدارة كما هو مطلوب.
--
--  يُفضَّل إضافةً لذلك إيقاف الإعداد من اللوحة لتتوقف رسائل البريد نهائياً:
--   Authentication → Sign In / Providers → Email → Confirm email = OFF
--  (اختياري — النظام يعمل بدونه بعد هذا السكربت.)
-- ============================================================================
