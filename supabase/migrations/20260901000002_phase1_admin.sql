-- ============================================================
-- ECOPLY.AI — Phase 1: Admin Foundation
-- Tables: regulations, emission_factors, verification_requests, audit_log
-- ============================================================

-- ============================================================
-- VERIFICATION REQUESTS
-- Admin reviews company/recycler registration
-- ============================================================

create type public.entity_type as enum ('company', 'recycler');
create type public.verification_action as enum ('approved', 'rejected');

create table public.verification_requests (
  id              uuid primary key default uuid_generate_v4(),
  entity_type     public.entity_type not null,
  entity_id       uuid not null,          -- companies.id or recyclers.id
  requested_by    uuid not null references auth.users(id),
  status          public.verification_status not null default 'pending',
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  note            text,                   -- admin note on approve/reject
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.verification_requests is 'Tracks verification status for companies and recyclers';

create trigger verification_requests_updated_at
  before update on public.verification_requests
  for each row execute function public.handle_updated_at();

create index vr_entity_idx    on public.verification_requests(entity_type, entity_id);
create index vr_status_idx    on public.verification_requests(status);
create index vr_reviewer_idx  on public.verification_requests(reviewed_by);

-- ============================================================
-- AUDIT LOG
-- Immutable log of admin actions (compliance requirement)
-- ============================================================

create table public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  actor_id     uuid not null references auth.users(id),
  action       text not null,             -- e.g. 'verification.approved', 'regulation.created'
  entity_type  text not null,             -- 'company', 'regulation', 'emission_factor', etc.
  entity_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

comment on table public.audit_log is 'Immutable audit trail for all admin actions';

-- Audit log is append-only — no update or delete allowed
create index al_actor_idx       on public.audit_log(actor_id);
create index al_entity_idx      on public.audit_log(entity_type, entity_id);
create index al_created_at_idx  on public.audit_log(created_at desc);

-- ============================================================
-- REGULATIONS
-- ESG regulation documents used as Compliance AI knowledge base
-- ============================================================

create type public.regulation_status as enum ('active', 'archived');

create table public.regulations (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  description    text,
  category       text not null,           -- e.g. 'OJK', 'KLHK', 'ISO', 'GRI', 'TCFD'
  version        text not null default '1.0',
  status         public.regulation_status not null default 'active',
  file_path      text,                    -- storage path in regulation-docs bucket
  file_name      text,
  file_size      bigint,
  uploaded_by    uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.regulations is 'ESG regulation documents for Compliance AI knowledge base';

create trigger regulations_updated_at
  before update on public.regulations
  for each row execute function public.handle_updated_at();

create index reg_status_idx   on public.regulations(status);
create index reg_category_idx on public.regulations(category);
create index reg_uploader_idx on public.regulations(uploaded_by);

-- ============================================================
-- EMISSION FACTORS
-- Configurable emission factors for Scope 1, 2, 3 calculations
-- ============================================================

create type public.emission_scope as enum ('scope1', 'scope2', 'scope3');
create type public.scope3_method as enum ('activity_based', 'spend_based');

create table public.emission_factors (
  id               uuid primary key default uuid_generate_v4(),
  scope            public.emission_scope not null,
  -- Scope 1 fields
  fuel_type        text,                  -- e.g. 'solar', 'bensin', 'gas_alam', 'batubara'
  -- Scope 2 fields
  region           text,                  -- e.g. 'Jawa-Bali', 'Sumatera', 'ID'
  energy_provider  text,
  -- Scope 3 fields
  scope3_method    public.scope3_method,
  category         text not null,         -- activity category name (flexible for all scopes)
  unit             text not null,         -- e.g. 'liter', 'kWh', 'km', 'kg', 'IDR'
  factor_value     numeric(18, 6) not null check (factor_value > 0),
  factor_unit      text not null default 'kgCO2e', -- always kgCO2e per unit
  source           text,                  -- e.g. 'IPCC 2006', 'Peraturan Menteri ESDM', 'PLN 2023'
  source_url       text,
  valid_from       date,
  valid_until      date,
  is_active        boolean not null default true,
  configured_by    uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.emission_factors is 'Configurable emission factors for Scope 1, 2, and 3 calculations';

create trigger emission_factors_updated_at
  before update on public.emission_factors
  for each row execute function public.handle_updated_at();

create index ef_scope_idx    on public.emission_factors(scope);
create index ef_active_idx   on public.emission_factors(is_active);
create index ef_category_idx on public.emission_factors(category);

-- ============================================================
-- SEED: default emission factors (Indonesia-specific)
-- configured_by will be set when first admin runs setup
-- We use a placeholder; update via admin UI or migration
-- ============================================================
-- (Seeded via admin UI in Fase 1, not hardcoded here)

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.verification_requests enable row level security;
alter table public.audit_log             enable row level security;
alter table public.regulations           enable row level security;
alter table public.emission_factors      enable row level security;

-- ── verification_requests ──────────────────────────────────

-- Entity owner can read their own request
create policy "vr: owner can read"
  on public.verification_requests for select
  using (requested_by = auth.uid());

-- Admin can read all
create policy "vr: admin can read all"
  on public.verification_requests for select
  using (public.is_admin());

-- Only system inserts via service role (or admin client)
-- Company/recycler row is created automatically when onboarding completes
-- Admin can update (approve/reject)
create policy "vr: admin can update"
  on public.verification_requests for update
  using (public.is_admin());

-- ── audit_log ──────────────────────────────────────────────

-- Only admins can read; no one can update or delete
create policy "audit_log: admin can read"
  on public.audit_log for select
  using (public.is_admin());

create policy "audit_log: no update"
  on public.audit_log for update
  using (false);

create policy "audit_log: no delete"
  on public.audit_log for delete
  using (false);

-- ── regulations ────────────────────────────────────────────

-- All authenticated users can read active regulations
-- (needed for Compliance AI in later phases)
create policy "regulations: authenticated can read active"
  on public.regulations for select
  using (
    auth.role() = 'authenticated'
    and status = 'active'
  );

-- Admin can read all (including archived)
create policy "regulations: admin can read all"
  on public.regulations for select
  using (public.is_admin());

create policy "regulations: admin can insert"
  on public.regulations for insert
  with check (public.is_admin());

create policy "regulations: admin can update"
  on public.regulations for update
  using (public.is_admin());

-- No hard delete — use archive instead
create policy "regulations: no delete"
  on public.regulations for delete
  using (false);

-- ── emission_factors ───────────────────────────────────────

-- All authenticated users can read active factors
create policy "ef: authenticated can read active"
  on public.emission_factors for select
  using (
    auth.role() = 'authenticated'
    and is_active = true
  );

-- Admin can read all
create policy "ef: admin can read all"
  on public.emission_factors for select
  using (public.is_admin());

create policy "ef: admin can insert"
  on public.emission_factors for insert
  with check (public.is_admin());

create policy "ef: admin can update"
  on public.emission_factors for update
  using (public.is_admin());

-- No hard delete — deactivate instead
create policy "ef: no delete"
  on public.emission_factors for delete
  using (false);

-- ============================================================
-- AUTO-CREATE verification_request on company/recycler insert
-- Uses a trigger so it's consistent regardless of insert path
-- ============================================================

create or replace function public.create_verification_request()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_entity_type public.entity_type;
begin
  v_entity_type := TG_ARGV[0]::public.entity_type;

  insert into public.verification_requests (
    entity_type, entity_id, requested_by, status
  ) values (
    v_entity_type, new.id, new.user_id, 'pending'
  )
  on conflict do nothing;

  return new;
end;
$$;

create trigger company_create_verification_request
  after insert on public.companies
  for each row execute function public.create_verification_request('company');

create trigger recycler_create_verification_request
  after insert on public.recyclers
  for each row execute function public.create_verification_request('recycler');
