create table if not exists public.matching_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  locked_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id)
);

create index if not exists matching_jobs_status_created_idx
on public.matching_jobs(status, created_at);

create index if not exists lost_items_category_status_idx
on public.lost_items(item_category, status);

create index if not exists lost_items_color_status_idx
on public.lost_items(color, status);

create index if not exists matches_target_idx
on public.matches(target_report_id);

create trigger matching_jobs_set_updated_at
before update on public.matching_jobs
for each row execute function public.set_updated_at();

alter table public.matching_jobs enable row level security;

create policy "Staff manage matching jobs" on public.matching_jobs
for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.enqueue_lost_found_matching_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_report_type public.report_type;
begin
  select type into related_report_type
  from public.reports
  where id = new.report_id;

  if related_report_type in ('lost_item', 'found_item') then
    insert into public.matching_jobs (report_id, status)
    values (new.report_id, 'pending')
    on conflict (report_id) do update set
      status = case
        when public.matching_jobs.status in ('processed', 'failed') then 'pending'
        else public.matching_jobs.status
      end,
      attempts = case
        when public.matching_jobs.status in ('processed', 'failed') then 0
        else public.matching_jobs.attempts
      end,
      locked_at = null,
      processed_at = case
        when public.matching_jobs.status in ('processed', 'failed') then null
        else public.matching_jobs.processed_at
      end,
      last_error = null,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists lost_items_enqueue_matching_job on public.lost_items;

create trigger lost_items_enqueue_matching_job
after insert on public.lost_items
for each row execute function public.enqueue_lost_found_matching_job();
