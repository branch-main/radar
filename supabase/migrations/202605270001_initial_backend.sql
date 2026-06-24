create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin', 'technician');
create type public.report_type as enum ('maintenance', 'lost_item', 'found_item', 'unknown');
create type public.report_status as enum ('new', 'classified', 'assigned', 'in_progress', 'waiting_claim', 'resolved', 'closed', 'cancelled');
create type public.maintenance_category as enum ('electrical', 'plumbing', 'cleaning', 'hvac', 'infrastructure', 'security', 'other');
create type public.urgency_level as enum ('low', 'medium', 'high', 'critical');
create type public.item_status as enum ('unclaimed', 'claim_pending', 'claimed', 'delivered', 'archived');
create type public.claim_status as enum ('pending', 'approved', 'rejected', 'delivered', 'cancelled');
create type public.match_status as enum ('suggested', 'notified', 'confirmed', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campus_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text not null,
  floor text,
  area_type text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  unique (building, name, floor)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  type public.report_type not null default 'unknown',
  status public.report_status not null default 'new',
  title text not null,
  description text not null,
  photo_url text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  zone_id uuid references public.campus_zones(id) on delete set null,
  ai_confidence numeric(4, 3),
  classification_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1))
);

create table public.technicians (
  id uuid primary key references public.profiles(id) on delete cascade,
  specialty public.maintenance_category,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.maintenance_incidents (
  report_id uuid primary key references public.reports(id) on delete cascade,
  category public.maintenance_category not null,
  urgency public.urgency_level not null default 'medium',
  assigned_to uuid references public.technicians(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lost_items (
  report_id uuid primary key references public.reports(id) on delete cascade,
  item_name text not null,
  item_category text not null default 'other',
  color text,
  brand text,
  distinguishing_marks text,
  status public.item_status not null default 'unclaimed',
  custody_location text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.lost_items(report_id) on delete cascade,
  claimed_by uuid not null references public.profiles(id) on delete cascade,
  status public.claim_status not null default 'pending',
  evidence text not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  source_report_id uuid not null references public.reports(id) on delete cascade,
  target_report_id uuid not null references public.reports(id) on delete cascade,
  score numeric(4, 3) not null,
  reason text not null,
  status public.match_status not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_report_id, target_report_id),
  check (source_report_id <> target_report_id),
  check (score >= 0 and score <= 1)
);

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_created_by_idx on public.reports(created_by);
create index reports_type_status_idx on public.reports(type, status);
create index reports_zone_created_idx on public.reports(zone_id, created_at desc);
create index maintenance_assigned_to_idx on public.maintenance_incidents(assigned_to);
create index maintenance_category_urgency_idx on public.maintenance_incidents(category, urgency);
create index lost_items_status_idx on public.lost_items(status);
create index claims_lost_item_idx on public.claims(lost_item_id);
create index matches_source_idx on public.matches(source_report_id);
create index notifications_user_unread_idx on public.notifications(user_id, read_at) where read_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.reports for each row execute function public.set_updated_at();
create trigger maintenance_set_updated_at before update on public.maintenance_incidents for each row execute function public.set_updated_at();
create trigger lost_items_set_updated_at before update on public.lost_items for each row execute function public.set_updated_at();
create trigger claims_set_updated_at before update on public.claims for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'technician'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

alter table public.profiles enable row level security;
alter table public.campus_zones enable row level security;
alter table public.reports enable row level security;
alter table public.technicians enable row level security;
alter table public.maintenance_incidents enable row level security;
alter table public.lost_items enable row level security;
alter table public.claims enable row level security;
alter table public.matches enable row level security;
alter table public.report_events enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are visible to owner and staff" on public.profiles
for select using (id = auth.uid() or public.is_staff());

create policy "Users update their profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());

create policy "Admins update profiles" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

create policy "Zones are visible to authenticated users" on public.campus_zones
for select using (auth.uid() is not null);

create policy "Admins manage zones" on public.campus_zones
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users create own reports" on public.reports
for insert with check (created_by = auth.uid());

create policy "Reports visible to owner and staff" on public.reports
for select using (created_by = auth.uid() or public.is_staff());

create policy "Users update own new reports" on public.reports
for update using (created_by = auth.uid() and status = 'new') with check (created_by = auth.uid());

create policy "Staff update reports" on public.reports
for update using (public.is_staff()) with check (public.is_staff());

create policy "Technicians are visible to staff" on public.technicians
for select using (public.is_staff());

create policy "Admins manage technicians" on public.technicians
for all using (public.is_admin()) with check (public.is_admin());

create policy "Maintenance visible by related report access" on public.maintenance_incidents
for select using (
  exists (
    select 1 from public.reports
    where reports.id = maintenance_incidents.report_id
    and (reports.created_by = auth.uid() or public.is_staff())
  )
);

create policy "Staff manage maintenance" on public.maintenance_incidents
for all using (public.is_staff()) with check (public.is_staff());

create policy "Lost items visible by related report access or active catalog" on public.lost_items
for select using (
  status in ('unclaimed', 'claim_pending')
  or exists (
    select 1 from public.reports
    where reports.id = lost_items.report_id
    and (reports.created_by = auth.uid() or public.is_staff())
  )
);

create policy "Staff manage lost items" on public.lost_items
for all using (public.is_staff()) with check (public.is_staff());

create policy "Claims visible to claimant and staff" on public.claims
for select using (claimed_by = auth.uid() or public.is_staff());

create policy "Users create own claims" on public.claims
for insert with check (claimed_by = auth.uid());

create policy "Staff manage claims" on public.claims
for update using (public.is_staff()) with check (public.is_staff());

create policy "Matches visible to related users and staff" on public.matches
for select using (
  public.is_staff()
  or exists (
    select 1 from public.reports
    where reports.id in (matches.source_report_id, matches.target_report_id)
    and reports.created_by = auth.uid()
  )
);

create policy "Staff manage matches" on public.matches
for all using (public.is_staff()) with check (public.is_staff());

create policy "Events visible by related report access" on public.report_events
for select using (
  exists (
    select 1 from public.reports
    where reports.id = report_events.report_id
    and (reports.created_by = auth.uid() or public.is_staff())
  )
);

create policy "Staff create events" on public.report_events
for insert with check (public.is_staff() or actor_id = auth.uid());

create policy "Notifications visible to owner" on public.notifications
for select using (user_id = auth.uid());

create policy "Users mark notifications read" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Staff create notifications" on public.notifications
for insert with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users read report photos" on storage.objects
for select using (bucket_id = 'report-photos' and auth.uid() is not null);

create policy "Users upload report photos to own folder" on storage.objects
for insert with check (
  bucket_id = 'report-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users manage own report photos" on storage.objects
for update using (
  bucket_id = 'report-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'report-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Staff manage report photos" on storage.objects
for all using (bucket_id = 'report-photos' and public.is_staff())
with check (bucket_id = 'report-photos' and public.is_staff());
