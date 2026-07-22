'use client';

/**
 * شاشة الدخول والتسجيل.
 *
 * تظهر لأي زائر ليست له جلسة — زران فقط: إنشاء حساب أو تسجيل دخول.
 * وُضعت كشاشة واحدة بدل صفحتين منفصلتين لتعمل مع التصدير الثابت بلا أي توجيه.
 */

import { AlertTriangle, Gamepad2, LogIn, Mail, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { AVATAR_COLORS } from '@/core/domain/defaults';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/core/utils/format';
import { Field, FormGrid, Input } from '@/components/ui/form';
import { Button, Card } from '@/components/ui/primitives';

type Mode = 'choose' | 'signup' | 'login';

interface SignupForm {
  name: string;
  age: string;
  robloxUsername: string;
  discordUsername: string;
  email: string;
  password: string;
}

interface LoginForm {
  name: string;
  discordUsername: string;
  email: string;
  password: string;
}

const BLANK_SIGNUP: SignupForm = {
  name: '',
  age: '',
  robloxUsername: '',
  discordUsername: '',
  email: '',
  password: '',
};

const BLANK_LOGIN: LoginForm = {
  name: '',
  discordUsername: '',
  email: '',
  password: '',
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('choose');
  const [signup, setSignup] = useState<SignupForm>(BLANK_SIGNUP);
  const [login, setLogin] = useState<LoginForm>(BLANK_LOGIN);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* --------------------------------- تسجيل --------------------------------- */

  async function doSignup() {
    setError(null);
    setNotice(null);

    if (!signup.name.trim()) return setError('الاسم مطلوب.');
    if (!signup.email.trim()) return setError('الإيميل مطلوب.');
    if (signup.password.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');

    setBusy(true);
    try {
      const client = supabase();

      // فحص مسبق حتى نعطي رسالة واضحة بدل خطأ قاعدة بيانات غامض
      const { data: availability } = await client.rpc('check_availability', {
        p_name: signup.name.trim(),
        p_email: signup.email.trim(),
        p_discord: signup.discordUsername.trim(),
        p_roblox: signup.robloxUsername.trim(),
      });

      const taken = availability as Record<string, boolean> | null;
      if (taken?.name) return setError('هذا الاسم مستخدم بالفعل من حساب آخر.');
      if (taken?.email) return setError('هذا الإيميل مسجّل بالفعل.');
      if (taken?.discord) return setError('اسم ديسكورد هذا مستخدم بالفعل.');
      if (taken?.roblox) return setError('اسم Roblox هذا مستخدم بالفعل.');

      const { data, error: signUpError } = await client.auth.signUp({
        email: signup.email.trim(),
        password: signup.password,
        options: {
          data: {
            name: signup.name.trim(),
            age: signup.age.trim(),
            roblox_username: signup.robloxUsername.trim(),
            discord_username: signup.discordUsername.trim(),
            avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          },
        },
      });

      if (signUpError) {
        // الخطأ قادم من محفّز قاعدة البيانات عند وجود مالك مسبقاً
        if (signUpError.message.includes('YARO_ALREADY_EXISTS')) {
          return setError('حساب المالك YARO موجود مسبقاً ولا يمكن إنشاؤه مرة أخرى.');
        }
        if (signUpError.message.toLowerCase().includes('already registered')) {
          return setError('هذا الإيميل مسجّل بالفعل.');
        }
        return setError(signUpError.message);
      }

      // إن كان تأكيد الإيميل مفعّلاً في Supabase فلن تُنشأ جلسة الآن
      if (!data.session) {
        setNotice(
          'تم إنشاء الحساب. تحقّق من بريدك الإلكتروني واضغط رابط التأكيد، ثم سجّل الدخول.',
        );
        setMode('login');
        setSignup(BLANK_SIGNUP);
        return;
      }

      // المخزن يلتقط تغيّر الجلسة تلقائياً ويعرض شاشة انتظار التفعيل
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر إنشاء الحساب.');
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------- دخول --------------------------------- */

  async function doLogin() {
    setError(null);
    setNotice(null);

    if (!login.email.trim() || !login.password) {
      return setError('الإيميل وكلمة المرور مطلوبان.');
    }

    setBusy(true);
    try {
      const client = supabase();

      const { data, error: signInError } = await client.auth.signInWithPassword({
        email: login.email.trim(),
        password: login.password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          return setError('لم يتم تأكيد بريدك بعد. افتح رسالة التأكيد في بريدك أولاً.');
        }
        return setError('بيانات الدخول غير صحيحة.');
      }

      // التحقق الإضافي: الاسم واسم ديسكورد يجب أن يطابقا الحساب المسجَّل
      const { data: member } = await client
        .from('members')
        .select('name, discord_username')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      const nameOk =
        (member?.name ?? '').trim().toLowerCase() === login.name.trim().toLowerCase();
      const discordOk =
        (member?.discord_username ?? '').trim().toLowerCase() ===
        login.discordUsername.trim().toLowerCase();

      if (!nameOk || !discordOk) {
        await client.auth.signOut();
        return setError('الاسم أو اسم ديسكورد لا يطابق هذا الحساب.');
      }

      // المخزن يلتقط الجلسة تلقائياً
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------- العرض --------------------------------- */

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-lg">
        {/* الشعار */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-3 grid size-14 place-items-center rounded-2xl text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Gamepad2 className="size-7" />
          </span>
          <h1 className="text-xl font-bold text-text">نظام إدارة استوديو ألعاب Roblox</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'choose'
              ? 'سجّل الدخول أو أنشئ حساباً جديداً للمتابعة'
              : mode === 'signup'
                ? 'إنشاء حساب جديد'
                : 'تسجيل الدخول'}
          </p>
        </div>

        <Card className="p-6">
          {error ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />
              <p className="text-xs leading-relaxed text-rose-300">{error}</p>
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3.5 py-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <p className="text-xs leading-relaxed text-sky-300">{notice}</p>
            </div>
          ) : null}

          {/* الزران */}
          {mode === 'choose' ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-4 text-right transition-all hover:border-accent hover:bg-surface-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <UserPlus className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text">إنشاء حساب</span>
                  <span className="block text-[11px] text-muted">
                    أول مرة تدخل الموقع؟ ابدأ من هنا
                  </span>
                </span>
              </button>

              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-4 text-right transition-all hover:border-accent hover:bg-surface-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <LogIn className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text">تسجيل الدخول</span>
                  <span className="block text-[11px] text-muted">لديك حساب بالفعل</span>
                </span>
              </button>
            </div>
          ) : null}

          {/* نموذج التسجيل */}
          {mode === 'signup' ? (
            <div className="space-y-4">
              <FormGrid>
                <Field label="الاسم" required hint="اسمك داخل الاستوديو">
                  <Input
                    value={signup.name}
                    onChange={(e) => setSignup({ ...signup, name: e.target.value })}
                    autoComplete="name"
                  />
                </Field>
                <Field label="العمر">
                  <Input
                    type="number"
                    min={1}
                    value={signup.age}
                    onChange={(e) => setSignup({ ...signup, age: e.target.value })}
                  />
                </Field>
                <Field label="الاسم في Roblox">
                  <Input
                    value={signup.robloxUsername}
                    onChange={(e) => setSignup({ ...signup, robloxUsername: e.target.value })}
                    dir="ltr"
                  />
                </Field>
                <Field label="الاسم في ديسكورد">
                  <Input
                    value={signup.discordUsername}
                    onChange={(e) => setSignup({ ...signup, discordUsername: e.target.value })}
                    dir="ltr"
                  />
                </Field>
              </FormGrid>

              <Field label="الإيميل" required>
                <Input
                  type="email"
                  value={signup.email}
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                  dir="ltr"
                  autoComplete="email"
                />
              </Field>

              <Field label="كلمة المرور" required hint="8 أحرف على الأقل">
                <Input
                  type="password"
                  value={signup.password}
                  onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                  dir="ltr"
                  autoComplete="new-password"
                />
              </Field>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" className="flex-1" onClick={doSignup} disabled={busy}>
                  {busy ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
                </Button>
                <Button variant="ghost" onClick={() => setMode('choose')} disabled={busy}>
                  رجوع
                </Button>
              </div>
            </div>
          ) : null}

          {/* نموذج الدخول */}
          {mode === 'login' ? (
            <div className="space-y-4">
              <FormGrid>
                <Field label="الاسم" required>
                  <Input
                    value={login.name}
                    onChange={(e) => setLogin({ ...login, name: e.target.value })}
                    autoComplete="name"
                  />
                </Field>
                <Field label="الاسم في ديسكورد" required>
                  <Input
                    value={login.discordUsername}
                    onChange={(e) => setLogin({ ...login, discordUsername: e.target.value })}
                    dir="ltr"
                  />
                </Field>
              </FormGrid>

              <Field label="الإيميل" required>
                <Input
                  type="email"
                  value={login.email}
                  onChange={(e) => setLogin({ ...login, email: e.target.value })}
                  dir="ltr"
                  autoComplete="email"
                />
              </Field>

              <Field label="كلمة المرور" required>
                <Input
                  type="password"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void doLogin();
                  }}
                  dir="ltr"
                  autoComplete="current-password"
                />
              </Field>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" className="flex-1" onClick={doLogin} disabled={busy}>
                  {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
                </Button>
                <Button variant="ghost" onClick={() => setMode('choose')} disabled={busy}>
                  رجوع
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <p className={cn('mt-4 text-center text-[11px] leading-relaxed text-faint')}>
          الحسابات الجديدة تحتاج تفعيلاً من الإدارة قبل استخدام النظام.
        </p>
      </div>
    </div>
  );
}
