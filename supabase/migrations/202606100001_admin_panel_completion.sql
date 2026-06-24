create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger system_settings_set_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;

create policy "Settings visible to staff" on public.system_settings
for select using (public.is_staff());

create policy "Admins manage settings" on public.system_settings
for all using (public.is_admin()) with check (public.is_admin());
