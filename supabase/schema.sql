-- Atlas (わせしぶ) Supabase スキーマ
-- Supabase Dashboard → SQL Editor で実行

create table if not exists public.user_data (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  photo_url text,
  app_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Users can read own data"
  on public.user_data for select
  using (auth.uid() = uid);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = uid);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = uid);

create index if not exists user_data_updated_at_idx
  on public.user_data (updated_at desc);
