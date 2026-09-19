create table public.audit_action_items (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references public.audit_reports(id) on delete cascade,
  item_index  integer not null,         -- posisi dalam array action_items
  task        text not null,            -- copy dari action_items[index].task
  completed   boolean not null default false,
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (report_id, item_index)
);

alter table public.audit_action_items enable row level security;

-- Company hanya bisa lihat & update miliknya
create policy "action_items: company can read own"
  on public.audit_action_items for select
  using (
    report_id in (
      select ar.id from public.audit_reports ar
      join public.audit_jobs aj on aj.id = ar.job_id
      join public.profiles p on p.company_id = aj.company_id
      where p.id = auth.uid()
    )
  );

create policy "action_items: company can update own"
  on public.audit_action_items for update
  using (
    report_id in (
      select ar.id from public.audit_reports ar
      join public.audit_jobs aj on aj.id = ar.job_id
      join public.profiles p on p.company_id = aj.company_id
      where p.id = auth.uid()
    )
  );

-- System/service role bisa insert (saat laporan dibuat)
create policy "action_items: admin can all"
  on public.audit_action_items for all
  using (public.is_admin());
