-- ============================================================================
--  نظام إدارة استوديو ألعاب Roblox — مخطط قاعدة البيانات الكامل
-- ============================================================================
--  شغّل هذا الملف مرة واحدة في:  Supabase → SQL Editor → New query → Run
--
--  ينشئ:
--   • كل الجداول
--   • دوال الصلاحيات داخل Postgres
--   • سياسات RLS تحمي البيانات حتى لو تجاوز أحدهم الواجهة
--   • تفعيل الحسابات، وحماية حساب YARO
--   • إشعار ديسكورد التلقائي عند كل نسخة احتياطية
--
--  الملف قابل لإعادة التشغيل بأمان (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_net";      -- لإرسال طلبات HTTP من قاعدة البيانات

-- ============================================================================
--  0) جدول الأسرار — لا يقرؤه أحد عبر الـ API إطلاقاً
-- ============================================================================

create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);

alter table public.app_secrets enable row level security;
-- لا نُنشئ أي سياسة: هذا يعني أن لا أحد يستطيع قراءته من الخارج.
-- الدوال المعرّفة بـ SECURITY DEFINER وحدها تستطيع الوصول إليه.

-- ============================================================================
--  1) الجداول الأساسية
-- ============================================================================

-- الإدارات ------------------------------------------------------------------
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null default '',
  color       text not null default '#6366f1',
  icon        text not null default 'briefcase',
  is_supreme  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- الرتب ---------------------------------------------------------------------
create table if not exists public.ranks (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name          text not null,
  level         int  not null default 1,
  -- الصلاحيات بصيغة resource.action مثل projects.edit، والرمز * يعني كل الصلاحيات
  permissions   text[] not null default '{}',
  color         text not null default '#6366f1',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (department_id, name)
);

-- الأعضاء / الموظفون --------------------------------------------------------
-- auth_user_id فارغ  = موظف مسجّل يدوياً بلا حساب دخول
-- auth_user_id موجود = حساب حقيقي يستطيع تسجيل الدخول
create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique references auth.users(id) on delete set null,

  name             text not null,
  age              int,
  roblox_username  text,
  discord_username text,
  email            text,

  department_id    uuid references public.departments(id) on delete set null,
  rank_id          uuid references public.ranks(id) on delete set null,

  specialty        text not null default '',
  join_date        date not null default current_date,
  status           text not null default 'active'
                     check (status in ('active','vacation','suspended')),
  agreement_type   text not null default 'monthly'
                     check (agreement_type in ('monthly','per_project','hourly')),
  salary           numeric(12,2) not null default 0,
  avatar_color     text not null default '#6366f1',
  notes            text default '',

  -- تفعيل الحساب: لا يرى المستخدم شيئاً قبل أن تفعّله الإدارة
  is_active        boolean not null default false,
  -- حساب محمي (YARO) لا يمكن إلغاء تفعيله ولا حذفه
  is_protected     boolean not null default false,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- منع تكرار أي معلومة بين الحسابات (غير حسّاس لحالة الأحرف)
create unique index if not exists members_name_key
  on public.members (lower(trim(name)));
create unique index if not exists members_email_key
  on public.members (lower(trim(email))) where email is not null and email <> '';
create unique index if not exists members_discord_key
  on public.members (lower(trim(discord_username)))
  where discord_username is not null and discord_username <> '';
create unique index if not exists members_roblox_key
  on public.members (lower(trim(roblox_username)))
  where roblox_username is not null and roblox_username <> '';

-- سجلات مرتبطة بالأعضاء ------------------------------------------------------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  amount     numeric(12,2) not null,
  date       date not null default current_date,
  type       text not null default 'salary' check (type in ('salary','bonus','project','other')),
  method     text not null default '',
  note       text default '',
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  from_rank_id uuid references public.ranks(id) on delete set null,
  to_rank_id   uuid references public.ranks(id) on delete set null,
  date         date not null default current_date,
  note         text default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.penalties (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  reason     text not null,
  severity   text not null default 'low' check (severity in ('low','medium','high')),
  amount     numeric(12,2),
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bonuses (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  amount     numeric(12,2) not null,
  reason     text not null default '',
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- المشاريع ------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  status      text not null default 'planning'
                check (status in ('planning','in_progress','testing','released','paused','cancelled')),
  progress    int not null default 0 check (progress between 0 and 100),
  priority    text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  start_date  date not null default current_date,
  due_date    date not null default current_date,
  member_ids  uuid[] not null default '{}',
  budget      numeric(12,2) not null default 0,
  game_url    text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- المهام --------------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  assignee_id   uuid references public.members(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  priority      text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status        text not null default 'todo'
                  check (status in ('todo','in_progress','review','done','blocked')),
  progress      int not null default 0 check (progress between 0 and 100),
  due_date      date not null default current_date,
  comments      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- المالية -------------------------------------------------------------------
create table if not exists public.transactions (
  id                 uuid primary key default gen_random_uuid(),
  type               text not null check (type in ('income','expense')),
  category           text not null,
  amount             numeric(12,2) not null,
  date               date not null default current_date,
  description        text not null default '',
  related_member_id  uuid references public.members(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- الملاحظات الخاصة -----------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  content    text not null,
  category   text not null default 'neutral'
               check (category in ('positive','negative','action','neutral')),
  author_id  uuid references public.members(id) on delete set null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- الحملات الإعلانية ----------------------------------------------------------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  platform    text not null default '',
  budget      numeric(12,2) not null default 0,
  spent       numeric(12,2) not null default 0,
  status      text not null default 'planned'
                check (status in ('planned','running','finished','cancelled')),
  start_date  date not null default current_date,
  end_date    date not null default current_date,
  impressions bigint not null default 0,
  clicks      bigint not null default 0,
  conversions bigint not null default 0,
  notes       text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- سجل النشاط ----------------------------------------------------------------
create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.members(id) on delete set null,
  actor_name text not null default 'النظام',
  action     text not null check (action in ('create','update','delete','import','export','login')),
  resource   text not null,
  entity_id  text not null default '',
  summary    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- البيانات (الإعلانات الرسمية) -----------------------------------------------
create table if not exists public.statements (
  id                uuid primary key default gen_random_uuid(),
  -- رقم البيان: تسلسلي تلقائي يظهر للمستخدم
  number            int generated always as identity,
  title             text not null,
  body              text not null,
  -- هل صدر البيان بأمر من رتبة أعلى داخل نفس الإدارة؟
  by_higher_order   boolean not null default false,
  higher_order_note text default '',
  author_id         uuid references public.members(id) on delete set null,
  author_name       text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- سجل النسخ الاحتياطية (يُشغّل إشعار ديسكورد) ---------------------------------
create table if not exists public.backup_logs (
  id               uuid primary key default gen_random_uuid(),
  actor_id         uuid references public.members(id) on delete set null,
  actor_name       text not null default '',
  discord_username text not null default '—',
  format           text not null default 'JSON',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- إعدادات النظام (صف واحد فقط) ------------------------------------------------
create table if not exists public.app_settings (
  id           int primary key default 1 check (id = 1),
  studio_name  text not null default 'استوديو تطوير ألعاب Roblox',
  currency     text not null default 'ر.س',
  theme        text not null default 'dark',
  accent_color text not null default '#6366f1',
  density      text not null default 'comfortable',
  animations   boolean not null default true,
  updated_at   timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================================
--  2) دوال الصلاحيات
-- ============================================================================
--  SECURITY DEFINER: تعمل بصلاحيات المالك فتستطيع قراءة members و ranks
--  دون الاصطدام بسياسات RLS (وإلا لحدث تكرار لا نهائي).
-- ============================================================================

-- سجل العضو المرتبط بالمستخدم الحالي
create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.members where auth_user_id = auth.uid() limit 1;
$$;

-- هل الحساب الحالي مفعّل؟
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.members where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

-- التحقق من صلاحية محددة — نقطة الحماية المركزية للنظام كله
create or replace function public.has_perm(res text, act text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.ranks r on r.id = m.rank_id
    where m.auth_user_id = auth.uid()
      and m.is_active = true
      and ('*' = any(r.permissions) or (res || '.' || act) = any(r.permissions))
  );
$$;

grant execute on function public.current_member_id() to authenticated;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.has_perm(text, text) to authenticated;

-- ============================================================================
--  3) تحديث updated_at تلقائياً
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'departments','ranks','members','payments','promotions','penalties','bonuses',
    'projects','tasks','transactions','notes','campaigns','activity','statements',
    'backup_logs'
  ] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$I', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ============================================================================
--  4) إنشاء العضو تلقائياً عند التسجيل + قاعدة YARO
-- ============================================================================
--  عند تسجيل مستخدم جديد يُنشأ له سجل عضو غير مفعّل.
--  الاستثناء الوحيد: الاسم YARO — يصبح مالكاً مفعّلاً محمياً، ومرة واحدة فقط.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'مستخدم جديد');
  v_owner_rank uuid;
  v_owner_dept uuid;
  v_is_yaro  boolean;
begin
  v_is_yaro := upper(trim(v_name)) = 'YARO';

  if v_is_yaro then
    -- YARO يُنشأ مرة واحدة فقط في عمر النظام
    if exists (select 1 from public.members where is_protected) then
      raise exception 'YARO_ALREADY_EXISTS';
    end if;

    select d.id, r.id into v_owner_dept, v_owner_rank
    from public.departments d
    join public.ranks r on r.department_id = d.id
    where d.is_supreme = true
    order by r.level asc
    limit 1;
  end if;

  insert into public.members (
    auth_user_id, name, age, roblox_username, discord_username, email,
    department_id, rank_id, is_active, is_protected, avatar_color, join_date
  ) values (
    new.id,
    v_name,
    nullif(new.raw_user_meta_data->>'age', '')::int,
    nullif(trim(new.raw_user_meta_data->>'roblox_username'), ''),
    nullif(trim(new.raw_user_meta_data->>'discord_username'), ''),
    new.email,
    case when v_is_yaro then v_owner_dept else null end,
    case when v_is_yaro then v_owner_rank else null end,
    v_is_yaro,          -- YARO مفعّل فوراً، والبقية ينتظرون
    v_is_yaro,          -- YARO محمي
    coalesce(nullif(new.raw_user_meta_data->>'avatar_color',''), '#6366f1'),
    current_date
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- حماية YARO: منع إلغاء تفعيله أو حذفه أو تنزيل رتبته
create or replace function public.protect_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_protected then
      raise exception 'PROTECTED_ACCOUNT';
    end if;
    return old;
  end if;

  if old.is_protected then
    if new.is_active = false then
      raise exception 'PROTECTED_ACCOUNT';
    end if;
    -- الرتبة والحماية لا تتغيران
    new.is_protected := true;
    new.rank_id := old.rank_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_owner_upd on public.members;
create trigger trg_protect_owner_upd
  before update on public.members
  for each row execute function public.protect_owner();

drop trigger if exists trg_protect_owner_del on public.members;
create trigger trg_protect_owner_del
  before delete on public.members
  for each row execute function public.protect_owner();

-- ============================================================================
--  5) فحص توفّر البيانات قبل التسجيل (يمنع التكرار برسالة واضحة)
-- ============================================================================

create or replace function public.check_availability(
  p_name text, p_email text, p_discord text, p_roblox text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name',    exists (select 1 from public.members where lower(trim(name)) = lower(trim(p_name))),
    'email',   exists (select 1 from public.members where lower(trim(email)) = lower(trim(p_email))),
    'discord', p_discord is not null and p_discord <> '' and
               exists (select 1 from public.members where lower(trim(discord_username)) = lower(trim(p_discord))),
    'roblox',  p_roblox is not null and p_roblox <> '' and
               exists (select 1 from public.members where lower(trim(roblox_username)) = lower(trim(p_roblox)))
  );
$$;

grant execute on function public.check_availability(text,text,text,text) to anon, authenticated;

-- ============================================================================
--  6) إشعار ديسكورد عند كل نسخة احتياطية
-- ============================================================================
--  رابط الويبهوك مخزّن في app_secrets ولا يصل إليه المتصفح إطلاقاً.
-- ============================================================================

create or replace function public.notify_backup_to_discord()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_when text;
begin
  select value into v_url from public.app_secrets where key = 'discord_webhook_url';
  if v_url is null or v_url = '' then
    return new;   -- لم يُضبط الويبهوك بعد — نتجاهل بهدوء
  end if;

  v_when := to_char(new.created_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI');

  perform net.http_post(
    url     := v_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object(
      'username', 'نظام إدارة الاستوديو',
      'embeds', jsonb_build_array(
        jsonb_build_object(
          'title', '📦 تم إنشاء نسخة احتياطية',
          'color', 6323595,
          'fields', jsonb_build_array(
            jsonb_build_object('name', 'اسم الاداري',      'value', coalesce(nullif(new.actor_name,''), '—'), 'inline', true),
            jsonb_build_object('name', 'اسمه في ديسكورد', 'value', coalesce(nullif(new.discord_username,''), '—'), 'inline', true),
            jsonb_build_object('name', 'التوقيت',          'value', v_when, 'inline', false),
            jsonb_build_object('name', 'النسخه',           'value', new.format, 'inline', true)
          ),
          'footer', jsonb_build_object('text', 'Roblox Studio Dashboard')
        )
      )
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_backup on public.backup_logs;
create trigger trg_notify_backup
  after insert on public.backup_logs
  for each row execute function public.notify_backup_to_discord();

-- ============================================================================
--  7) سياسات RLS
-- ============================================================================
--  هذه هي الحماية الحقيقية: حتى لو استدعى أحدهم الـ API مباشرة متجاوزاً
--  الواجهة، لن يقرأ ولن يكتب إلا ما تسمح به رتبته.
-- ============================================================================

-- تفعيل RLS على كل الجداول
do $$
declare t text;
begin
  foreach t in array array[
    'departments','ranks','members','payments','promotions','penalties','bonuses',
    'projects','tasks','transactions','notes','campaigns','activity','statements',
    'backup_logs','app_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- سياسات CRUD القياسية: كل جدول مربوط بقسم صلاحيات
do $$
declare
  rec record;
  mapping constant text[][] := array[
    ['departments','departments'],
    ['ranks','ranks'],
    ['payments','finance'],
    ['promotions','members'],
    ['penalties','members'],
    ['bonuses','members'],
    ['projects','projects'],
    ['tasks','tasks'],
    ['transactions','finance'],
    ['notes','notes'],
    ['campaigns','campaigns']
  ];
  i int;
  tbl text;
  res text;
begin
  for i in 1 .. array_length(mapping, 1) loop
    tbl := mapping[i][1];
    res := mapping[i][2];

    execute format('drop policy if exists "%1$s_select" on public.%1$I', tbl);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', tbl);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', tbl);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', tbl);

    execute format(
      'create policy "%1$s_select" on public.%1$I for select to authenticated
       using (public.has_perm(%2$L, ''view''))', tbl, res);
    execute format(
      'create policy "%1$s_insert" on public.%1$I for insert to authenticated
       with check (public.has_perm(%2$L, ''create''))', tbl, res);
    execute format(
      'create policy "%1$s_update" on public.%1$I for update to authenticated
       using (public.has_perm(%2$L, ''edit'')) with check (public.has_perm(%2$L, ''edit''))', tbl, res);
    execute format(
      'create policy "%1$s_delete" on public.%1$I for delete to authenticated
       using (public.has_perm(%2$L, ''delete''))', tbl, res);
  end loop;
end $$;

-- الأعضاء: كل مستخدم يرى سجله دائماً (ليعرف حالة تفعيله) ------------------
drop policy if exists "members_select_own" on public.members;
create policy "members_select_own" on public.members
  for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "members_select_perm" on public.members;
create policy "members_select_perm" on public.members
  for select to authenticated
  using (public.has_perm('members','view') or public.has_perm('users','view'));

drop policy if exists "members_insert" on public.members;
create policy "members_insert" on public.members
  for insert to authenticated
  with check (public.has_perm('members','create'));

drop policy if exists "members_update" on public.members;
create policy "members_update" on public.members
  for update to authenticated
  using (public.has_perm('members','edit') or public.has_perm('users','edit'))
  with check (public.has_perm('members','edit') or public.has_perm('users','edit'));

drop policy if exists "members_delete" on public.members;
create policy "members_delete" on public.members
  for delete to authenticated
  using (public.has_perm('members','delete') or public.has_perm('users','delete'));

-- سجل النشاط: أي عضو مفعّل يكتب فيه، والقراءة بصلاحية ----------------------
drop policy if exists "activity_select" on public.activity;
create policy "activity_select" on public.activity
  for select to authenticated using (public.has_perm('activity','view'));

drop policy if exists "activity_insert" on public.activity;
create policy "activity_insert" on public.activity
  for insert to authenticated with check (public.is_active_member());

-- البيانات: الإرسال بصلاحية، والقراءة بصلاحية أو لصاحب البيان ---------------
drop policy if exists "statements_select" on public.statements;
create policy "statements_select" on public.statements
  for select to authenticated
  using (public.has_perm('statements','view') or author_id = public.current_member_id());

drop policy if exists "statements_insert" on public.statements;
create policy "statements_insert" on public.statements
  for insert to authenticated
  with check (public.has_perm('statements','create'));

drop policy if exists "statements_update" on public.statements;
create policy "statements_update" on public.statements
  for update to authenticated
  using (public.has_perm('statements','edit')) with check (public.has_perm('statements','edit'));

drop policy if exists "statements_delete" on public.statements;
create policy "statements_delete" on public.statements
  for delete to authenticated using (public.has_perm('statements','delete'));

-- سجل النسخ الاحتياطية ------------------------------------------------------
drop policy if exists "backup_logs_select" on public.backup_logs;
create policy "backup_logs_select" on public.backup_logs
  for select to authenticated using (public.has_perm('backup','view'));

drop policy if exists "backup_logs_insert" on public.backup_logs;
create policy "backup_logs_insert" on public.backup_logs
  for insert to authenticated with check (public.has_perm('backup','view'));

-- الإعدادات: يقرؤها كل عضو مفعّل، ويعدّلها صاحب الصلاحية --------------------
drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings
  for select to authenticated using (public.is_active_member());

drop policy if exists "app_settings_update" on public.app_settings;
create policy "app_settings_update" on public.app_settings
  for update to authenticated
  using (public.has_perm('settings','edit')) with check (public.has_perm('settings','edit'));

-- الإدارات والرتب: يجب أن يقرأها أي عضو مفعّل ليعمل النظام ------------------
drop policy if exists "departments_select" on public.departments;
create policy "departments_select" on public.departments
  for select to authenticated using (public.is_active_member());

drop policy if exists "ranks_select" on public.ranks;
create policy "ranks_select" on public.ranks
  for select to authenticated using (public.is_active_member());

-- ============================================================================
--  8) البيانات الأولية — الحد الأدنى اللازم لإقلاع النظام
-- ============================================================================
--  لا أعضاء ولا مشاريع ولا مهام (النظام يبدأ فارغاً كما طلبت).
--  لكن يجب وجود الإدارة العليا ورتبة المالك حتى يجد حساب YARO رتبته.
-- ============================================================================

insert into public.departments (name, description, color, icon, is_supreme)
values ('الإدارة العليا',
        'الإشراف الكامل على الاستوديو وجميع الإدارات، وتملك كل الصلاحيات.',
        '#a855f7', 'crown', true)
on conflict (name) do nothing;

insert into public.ranks (department_id, name, level, permissions, color)
select d.id, 'مالك الاستوديو', 1, array['*'], '#a855f7'
from public.departments d
where d.is_supreme = true
on conflict (department_id, name) do nothing;

-- ============================================================================
--  تم. لإضافة رابط ويبهوك ديسكورد شغّل هذا السطر بعد تعديله:
--
--    insert into public.app_secrets (key, value)
--    values ('discord_webhook_url', 'https://discord.com/api/webhooks/....')
--    on conflict (key) do update set value = excluded.value;
--
-- ============================================================================
