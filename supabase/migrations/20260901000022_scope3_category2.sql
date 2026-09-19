-- ============================================================
-- ECOPLY.AI — Scope 3 Category 2: Capital Goods
-- Struktur paralel dengan Category 1 (Purchased Goods/Services)
-- ============================================================

-- ── Master Tables ────────────────────────────────────────────

-- Average-Data Factors (Physical-Based)
create table public.s3c2_average_factors (
  id              uuid primary key default uuid_generate_v4(),
  material_name   text not null,
  unit            text not null,
  ef_kg_co2e      numeric(18, 8) not null,
  source          text,
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (material_name, unit)
);

comment on table public.s3c2_average_factors is
  'Scope 3 Category 2 (Capital Goods) average emission factors per material';

create trigger s3c2_avg_updated_at
  before update on public.s3c2_average_factors
  for each row execute function public.handle_updated_at();

-- Spend-Based Factors (EEIO)
create table public.s3c2_spend_factors (
  id              uuid primary key default uuid_generate_v4(),
  sector_name     text not null,
  currency        text not null check (currency in ('IDR', 'USD', 'EUR', 'GBP')),
  ef_kg_co2e      numeric(24, 12) not null,
  eeio_database   text,
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (sector_name, currency)
);

comment on table public.s3c2_spend_factors is
  'Scope 3 Category 2 (Capital Goods) EEIO spend-based emission factors';

create trigger s3c2_spend_updated_at
  before update on public.s3c2_spend_factors
  for each row execute function public.handle_updated_at();

-- ── Activity Table ───────────────────────────────────────────

create table public.ca_s3c2 (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  submitted_by    uuid not null references auth.users(id),
  method          text not null check (method in ('supplier_specific', 'average_data', 'spend_based')),
  -- Supplier-specific fields
  supplier_name   text,
  product_name    text,
  supplier_ef_kg_co2e_per_unit numeric(18, 8),
  -- Average-data fields
  ef_average_id   uuid references public.s3c2_average_factors(id),
  material_name   text,
  -- Spend-based fields
  ef_spend_id     uuid references public.s3c2_spend_factors(id),
  sector_name     text,
  currency        text,
  -- Common activity data
  quantity        numeric(18, 4) not null check (quantity > 0),
  unit            text not null,
  -- Result
  emission_co2e   numeric(18, 6),
  ef_snapshot     jsonb,
  period_start    date not null,
  period_end      date not null,
  notes           text,
  status          text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected')),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

comment on table public.ca_s3c2 is
  'Scope 3 Category 2 (Capital Goods) activity records';

create trigger ca_s3c2_updated_at
  before update on public.ca_s3c2
  for each row execute function public.handle_updated_at();

create index ca_s3c2_company_idx on public.ca_s3c2(company_id);
create index ca_s3c2_status_idx  on public.ca_s3c2(status);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

alter table public.s3c2_average_factors enable row level security;
alter table public.s3c2_spend_factors   enable row level security;
alter table public.ca_s3c2              enable row level security;

-- Master tables: authenticated can read active, admin full control
do $$
declare t text;
begin
  foreach t in array array['s3c2_average_factors', 's3c2_spend_factors'] loop
    execute format(
      'create policy "%s: authenticated can read active" on public.%s for select
       using (auth.role() = ''authenticated'' and is_active = true)', t, t);
    execute format(
      'create policy "%s: admin can read all" on public.%s for select
       using (public.is_admin())', t, t);
    execute format(
      'create policy "%s: admin can insert" on public.%s for insert
       with check (public.is_admin())', t, t);
    execute format(
      'create policy "%s: admin can update" on public.%s for update
       using (public.is_admin())', t, t);
    execute format(
      'create policy "%s: no delete" on public.%s for delete using (false)', t, t);
  end loop;
end $$;

-- Activity table: company own data
do $$
begin
  execute 'create policy "ca_s3c2: company can read own" on public.ca_s3c2 for select
           using (company_id = public.get_company_id())';
  execute 'create policy "ca_s3c2: company can insert" on public.ca_s3c2 for insert
           with check (company_id = public.get_company_id())';
  execute 'create policy "ca_s3c2: company can update own" on public.ca_s3c2 for update
           using (company_id = public.get_company_id())
           with check (company_id = public.get_company_id())';
  execute 'create policy "ca_s3c2: company can delete draft" on public.ca_s3c2 for delete
           using (company_id = public.get_company_id() and status = ''draft'')';
  execute 'create policy "ca_s3c2: admin can read all" on public.ca_s3c2 for select
           using (public.is_admin())';
end $$;