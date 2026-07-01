create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'system_settings_set_updated_at'
      and tgrelid = 'public.system_settings'::regclass
  ) then
    create trigger system_settings_set_updated_at
    before update on public.system_settings
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.system_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_settings'
      and policyname = 'Settings visible to staff'
  ) then
    create policy "Settings visible to staff" on public.system_settings
    for select using (public.is_staff());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'system_settings'
      and policyname = 'Admins manage settings'
  ) then
    create policy "Admins manage settings" on public.system_settings
    for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
