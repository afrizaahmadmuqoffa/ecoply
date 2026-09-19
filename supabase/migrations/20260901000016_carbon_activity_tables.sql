-- ============================================================
-- ECOPLY.AI — Carbon Activity Tables
-- Company emission records per scope/category
-- ============================================================

-- ── SCOPE 1: Combustion (Stationary & Mobile Fuel-Based) ──

create table public.ca_combustion (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  submitted_by    uuid not null references auth.users(id),
  scope_category  text not null check (scope_category in ('stationary', 'mobile')),
  ef_combustion_id uuid references public.ef_combustion(id),  -- nullable: allow custom
  -- Activity data
  fuel_name       text not null,
  unit            text not null,
  quantity        numeric(18, 4) not null check (quantity > 0),
  period_start    date not null,
  period_end      date not null,
  notes           text,
  -- Calculated results (filled after calc)
  emission_scope1_co2e      numeric(18, 6),  -- kg CO2e (masuk total)
  emission_outside_scope_co2e numeric(18, 6), -- kg CO2e (dicatat terpisah)
  -- Snapshot of factor used (for audit trail)
  ef_snapshot     jsonb,
  -- Review
  status          text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected')),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

create trigger ca_combustion_updated_at
  before update on public.ca_combustion
  for each row execute function public.handle_updated_at();

create index ca_comb_company_idx on public.ca_combustion(company_id);
create index ca_comb_status_idx  on public.ca_combustion(status);

-- ── SCOPE 1: Mobile — Vehicle/Distance-Based ──────────────

create table public.ca_vehicle (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  submitted_by    uuid not null references auth.users(id),
  ef_vehicle_id   uuid references public.ef_vehicle(id),
  vehicle_type    text not null,
  unit            text not null check (unit in ('km', 'mile')),
  distance        numeric(18, 4) not null check (distance > 0),
  period_start    date not null,
  period_end      date not null,
  notes           text,
  emission_co2e   numeric(18, 6),
  ef_snapshot     jsonb,
  status          text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected')),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

create trigger ca_vehicle_updated_at
  before update on public.ca_vehicle
  for each row execute function public.handle_updated_at();

create index ca_vehicle_company_idx on public.ca_vehicle(company_id);

-- ── SCOPE 1: Fugitive Emissions ───────────────────────────

create table public.ca_fugitive (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  submitted_by        uuid not null references auth.users(id),
  method              text not null check (method in ('top_up', 'screening')),
  refrigerant_name    text not null,
  refrigerant_gwp_id  uuid references public.refrigerant_gwp(id),
  gwp_value           numeric(12, 2) not null,  -- snapshot at time of entry
  -- Top-up method fields
  mass_refilled_kg    numeric(18, 4),
  -- Screening method fields
  asset_category_id   uuid references public.fugitive_asset_categories(id),
  asset_category_name text,
  total_capacity_kg   numeric(18, 4),
  leakage_rate        numeric(6, 4),  -- fraction e.g. 0.05 for 5%
  estimated_leakage_kg numeric(18, 4), -- computed: capacity * rate
  -- Result
  emission_co2e       numeric(18, 6),  -- kg CO2e = leaked_kg * gwp
  period_start        date not null,
  period_end          date not null,
  notes               text,
  status              text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected')),
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

create trigger ca_fugitive_updated_at
  before update on public.ca_fugitive
  for each row execute function public.handle_updated_at();

create index ca_fugitive_company_idx on public.ca_fugitive(company_id);

-- ── SCOPE 2: Energy Consumption ──────────────────────────

create table public.ca_energy (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  submitted_by        uuid not null references auth.users(id),
  energy_type         text not null check (energy_type in ('electricity', 'steam')),
  grid_ef_id          uuid references public.grid_emission_factors(id),
  region_name         text,
  unit                text not null check (unit in ('kWh', 'MWh', 'MMBtu')),
  consumption         numeric(18, 4) not null check (consumption > 0),
  -- Custom EF override (optional)
  use_custom_ef       boolean not null default false,
  custom_ef_kg_co2e   numeric(18, 8),
  -- Result
  emission_co2e       numeric(18, 6),
  ef_snapshot         jsonb,
  period_start        date not null,
  period_end          date not null,
  notes               text,
  status              text not null default 'draft' check (status in ('draft', 'confirmed', 'rejected')),
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint period_valid check (period_end >= period_start)
);

create trigger ca_energy_updated_at
  before update on public.ca_energy
  for each row execute function public.handle_updated_at();

create index ca_energy_company_idx on public.ca_energy(company_id);

-- ── SCOPE 3 Cat 1: Purchased Goods/Services ──────────────

create table public.ca_s3c1 (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  submitted_by    uuid not null references auth.users(id),
  method          text not null check (method in ('supplier_specific', 'average_data', 'spend_based')),
  -- Supplier-specific fields
  supplier_name   text,
  product_name    text,
  supplier_ef_kg_co2e_per_unit numeric(18, 8),  -- from supplier
  -- Average-data fields
  ef_average_id   uuid references public.s3c1_average_factors(id),
  material_name   text,
  -- Spend-based fields
  ef_spend_id     uuid references public.s3c1_spend_factors(id),
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

create trigger ca_s3c1_updated_at
  before update on public.ca_s3c1
  for each row execute function public.handle_updated_at();

create index ca_s3c1_company_idx on public.ca_s3c1(company_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────

alter table public.ca_combustion enable row level security;
alter table public.ca_vehicle     enable row level security;
alter table public.ca_fugitive    enable row level security;
alter table public.ca_energy      enable row level security;
alter table public.ca_s3c1        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ca_combustion','ca_vehicle','ca_fugitive','ca_energy','ca_s3c1'] loop
    execute format(
      'create policy "%s: company can read own" on public.%s for select
       using (company_id in (select company_id from public.profiles where id = auth.uid()))',
      t, t);
    execute format(
      'create policy "%s: company can insert" on public.%s for insert
       with check (company_id in (select company_id from public.profiles where id = auth.uid() and role = ''company''))',
      t, t);
    execute format(
      'create policy "%s: company can update draft" on public.%s for update
       using (company_id in (select company_id from public.profiles where id = auth.uid()) and status = ''draft'')',
      t, t);
    execute format(
      'create policy "%s: admin can read all" on public.%s for select using (public.is_admin())',
      t, t);
  end loop;
end $$;
