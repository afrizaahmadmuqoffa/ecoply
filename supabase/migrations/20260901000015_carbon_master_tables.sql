-- ============================================================
-- ECOPLY.AI — Carbon Accounting Master Tables
-- No seed data — admin inputs values via UI
-- ============================================================

-- ── SCOPE 1: Combustion (Stationary & Mobile Fuel-Based) ──

create table public.ef_combustion (
  id              uuid primary key default uuid_generate_v4(),
  scope_category  text not null check (scope_category in ('stationary', 'mobile')),
  fuel_name       text not null,              -- "Diesel", "Petrol", "Natural Gas", etc.
  unit            text not null,              -- liter | kg | m³ | kWh | GJ | tonne
  -- Pre-calculated CO2e factors (DEFRA GWP already included)
  ef_scope1_co2e  numeric(18, 8) not null,    -- kg CO2e per unit (fossil, goes into Scope 1)
  ef_outside_scope_co2e numeric(18, 8) not null default 0,
                                              -- kg CO2e per unit (biogenic CO2, reported separately)
  -- Raw gas factors (for transparency / audit trail)
  ef_co2          numeric(18, 8),             -- kg CO2 per unit
  ef_ch4          numeric(18, 8),             -- kg CH4 per unit
  ef_n2o          numeric(18, 8),             -- kg N2O per unit
  is_fossil       boolean not null default true,
  source          text,                       -- "DEFRA 2024", etc.
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (scope_category, fuel_name, unit)
);

comment on table public.ef_combustion is
  'Emission factors for Scope 1 stationary and mobile combustion (fuel-based, DEFRA)';

create trigger ef_combustion_updated_at
  before update on public.ef_combustion
  for each row execute function public.handle_updated_at();

create index ef_combustion_category_idx on public.ef_combustion(scope_category);
create index ef_combustion_active_idx   on public.ef_combustion(is_active);

-- ── SCOPE 1: Mobile Combustion — Vehicle / Distance-Based ─

create table public.ef_vehicle (
  id              uuid primary key default uuid_generate_v4(),
  vehicle_type    text not null,              -- "Passenger Car - Petrol", "HGV - Diesel", etc.
  unit            text not null check (unit in ('km', 'mile')),
  ef_co2e         numeric(18, 8) not null,    -- kg CO2e per km/mile
  ef_co2          numeric(18, 8),
  ef_ch4          numeric(18, 8),
  ef_n2o          numeric(18, 8),
  source          text,
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (vehicle_type, unit)
);

comment on table public.ef_vehicle is
  'Emission factors for mobile combustion (distance-based / Option B)';

create trigger ef_vehicle_updated_at
  before update on public.ef_vehicle
  for each row execute function public.handle_updated_at();

-- ── SCOPE 1: Fugitive — Refrigerant GWP ──────────────────

create table public.refrigerant_gwp (
  id               uuid primary key default uuid_generate_v4(),
  refrigerant_name text not null unique,      -- "R-32", "R-410A", "SF6", etc.
  gas_type         text not null check (gas_type in ('HFC', 'PFC', 'SF6', 'NF3', 'HCFC', 'Other')),
  gwp_value        numeric(12, 2) not null,   -- GWP100 (AR5 recommended, or as per source)
  source           text,                      -- "IPCC AR5", "DEFRA 2024"
  is_active        boolean not null default true,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.refrigerant_gwp is
  'GWP values per refrigerant for Scope 1 fugitive emissions calculation';

create trigger refrigerant_gwp_updated_at
  before update on public.refrigerant_gwp
  for each row execute function public.handle_updated_at();

-- ── SCOPE 1: Fugitive — Asset Categories (Screening Method) ─

create table public.fugitive_asset_categories (
  id                   uuid primary key default uuid_generate_v4(),
  category_name        text not null unique,  -- "Small split AC (<5kg)", "Industrial chiller"
  annual_leakage_rate  numeric(6, 4) not null check (annual_leakage_rate >= 0 and annual_leakage_rate <= 1),
                                              -- fraction: 0.05 = 5% per year
  typical_refrigerant  text,                  -- hint, not constraint
  notes                text,
  source               text,                  -- "IPCC 2006 Vol.2", "DEFRA"
  is_active            boolean not null default true,
  created_by           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.fugitive_asset_categories is
  'Asset categories with standard annual leakage rates for fugitive emissions screening method';

create trigger fugitive_asset_categories_updated_at
  before update on public.fugitive_asset_categories
  for each row execute function public.handle_updated_at();

-- ── SCOPE 2: Grid Emission Factors ────────────────────────

create table public.grid_emission_factors (
  id              uuid primary key default uuid_generate_v4(),
  region_name     text not null,              -- "Jawa-Madura-Bali", "Sumatera", "Global - MMBtu"
  energy_type     text not null check (energy_type in ('electricity', 'steam')),
  unit            text not null check (unit in ('kWh', 'MWh', 'MMBtu')),
  ef_kg_co2e      numeric(18, 8) not null,    -- kg CO2e per unit
  method          text check (method in ('location_based', 'market_based')),
  country         text default 'ID',
  source          text,
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (region_name, energy_type, unit)
);

comment on table public.grid_emission_factors is
  'Scope 2 emission factors per grid region / energy type';

create trigger grid_ef_updated_at
  before update on public.grid_emission_factors
  for each row execute function public.handle_updated_at();

create index grid_ef_type_idx on public.grid_emission_factors(energy_type);

-- ── SCOPE 3 Cat 1: Average-Data Factors (Physical-Based) ──

create table public.s3c1_average_factors (
  id              uuid primary key default uuid_generate_v4(),
  material_name   text not null,              -- "Steel", "Aluminium", "Plastic - PET", etc.
  unit            text not null,              -- kg | tonne | litre | unit
  ef_kg_co2e      numeric(18, 8) not null,    -- kg CO2e per unit
  source          text,                       -- "DEFRA 2024", "ecoinvent"
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (material_name, unit)
);

comment on table public.s3c1_average_factors is
  'Scope 3 Category 1 average emission factors per material (physical-based method)';

create trigger s3c1_avg_updated_at
  before update on public.s3c1_average_factors
  for each row execute function public.handle_updated_at();

-- ── SCOPE 3 Cat 1: Spend-Based Factors (EEIO) ────────────

create table public.s3c1_spend_factors (
  id              uuid primary key default uuid_generate_v4(),
  sector_name     text not null,              -- "Iron & Steel", "Chemicals", etc.
  currency        text not null check (currency in ('IDR', 'USD', 'EUR', 'GBP')),
  ef_kg_co2e      numeric(24, 12) not null,   -- kg CO2e per 1 unit currency (very small number)
  eeio_database   text,                       -- "US EEIO 2.0", "UK DEFRA", "Exiobase"
  year_reference  smallint,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (sector_name, currency)
);

comment on table public.s3c1_spend_factors is
  'Scope 3 Category 1 EEIO spend-based emission factors per industry sector';

create trigger s3c1_spend_updated_at
  before update on public.s3c1_spend_factors
  for each row execute function public.handle_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────

alter table public.ef_combustion              enable row level security;
alter table public.ef_vehicle                 enable row level security;
alter table public.refrigerant_gwp            enable row level security;
alter table public.fugitive_asset_categories  enable row level security;
alter table public.grid_emission_factors      enable row level security;
alter table public.s3c1_average_factors       enable row level security;
alter table public.s3c1_spend_factors         enable row level security;

-- Authenticated users can read active records (needed for company input forms)
do $$
declare
  t text;
begin
  foreach t in array array[
    'ef_combustion', 'ef_vehicle', 'refrigerant_gwp',
    'fugitive_asset_categories', 'grid_emission_factors',
    's3c1_average_factors', 's3c1_spend_factors'
  ] loop
    execute format(
      'create policy "%s: authenticated can read active"
       on public.%s for select
       using (auth.role() = ''authenticated'' and is_active = true)',
      t, t
    );
    execute format(
      'create policy "%s: admin can read all"
       on public.%s for select
       using (public.is_admin())',
      t, t
    );
    execute format(
      'create policy "%s: admin can insert"
       on public.%s for insert
       with check (public.is_admin())',
      t, t
    );
    execute format(
      'create policy "%s: admin can update"
       on public.%s for update
       using (public.is_admin())',
      t, t
    );
    execute format(
      'create policy "%s: no delete"
       on public.%s for delete
       using (false)',
      t, t
    );
  end loop;
end $$;
