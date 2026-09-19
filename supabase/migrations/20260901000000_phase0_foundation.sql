-- ============================================================
-- ECOPLY.AI — Phase 0: Foundation
-- Identity, Roles, RBAC, RLS
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
-- pgvector & postgis enabled for future phases
create extension if not exists "vector";
create extension if not exists "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum ('company', 'recycler', 'admin');
create type public.verification_status as enum ('pending', 'verified', 'rejected');

-- ============================================================
-- COMPANIES
-- ============================================================

create table public.companies (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  industry             text,
  address              text,
  npwp                 text,                -- Nomor Pokok Wajib Pajak (unique business tax ID)
  logo_url             text,
  verification_status  public.verification_status not null default 'pending',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

comment on table public.companies is 'Company entities registered on ECOPLY.AI';

-- ============================================================
-- RECYCLERS
-- ============================================================

create table public.recyclers (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  name                    text not null,
  address                 text,
  capacity_kg_per_month   numeric,
  logo_url                text,
  verification_status     public.verification_status not null default 'pending',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id)
);

comment on table public.recyclers is 'Recycling facility entities registered on ECOPLY.AI';

-- ============================================================
-- PROFILES (linked to auth.users, stores role)
-- ============================================================

create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  role                 public.user_role not null,
  company_id           uuid references public.companies(id) on delete set null,
  recycler_id          uuid references public.recyclers(id) on delete set null,
  verification_status  public.verification_status not null default 'pending',
  full_name            text,
  avatar_url           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A profile can only link to one entity type at a time
  constraint profile_role_entity_check check (
    (role = 'company'  and company_id  is not null and recycler_id is null) or
    (role = 'recycler' and recycler_id is not null and company_id  is null) or
    (role = 'admin'    and company_id  is null     and recycler_id is null)
  )
);

comment on table public.profiles is 'User profiles with role assignment. One-to-one with auth.users.';

-- ============================================================
-- UPDATED_AT trigger (reusable)
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.handle_updated_at();

create trigger recyclers_updated_at
  before update on public.recyclers
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE on signup (via auth trigger)
-- Role is set by the application during onboarding, defaulting
-- to a temporary state. The profile will be created with the
-- chosen role once the user completes onboarding.
-- ============================================================

-- This function is called via the Supabase Dashboard trigger
-- or via a Database Webhook on auth.users INSERT.
-- We leave role assignment to the onboarding Server Action.

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles  enable row level security;
alter table public.companies enable row level security;
alter table public.recyclers enable row level security;

-- ------------------------------------------------------------
-- HELPER FUNCTIONS (avoid repetitive subqueries in policies)
-- ------------------------------------------------------------

-- Returns the role of the currently authenticated user
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Returns true if current user is admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- PROFILES RLS
-- ------------------------------------------------------------

-- Users can read their own profile
create policy "profiles: owner can read"
  on public.profiles for select
  using (id = auth.uid());

-- Admins can read all profiles
create policy "profiles: admin can read all"
  on public.profiles for select
  using (public.is_admin());

-- Users can insert their own profile (during onboarding)
create policy "profiles: owner can insert"
  on public.profiles for insert
  with check (id = auth.uid());

-- Users can update their own profile
create policy "profiles: owner can update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any profile (e.g., change verification_status)
create policy "profiles: admin can update"
  on public.profiles for update
  using (public.is_admin());

-- No one can delete profiles via API (use auth.users cascade)
create policy "profiles: no direct delete"
  on public.profiles for delete
  using (false);

-- ------------------------------------------------------------
-- COMPANIES RLS
-- ------------------------------------------------------------

-- Company owner can read their own company
create policy "companies: owner can read"
  on public.companies for select
  using (user_id = auth.uid());

-- Admin can read all companies
create policy "companies: admin can read all"
  on public.companies for select
  using (public.is_admin());

-- Recyclers can read verified companies (needed for marketplace context)
create policy "companies: recycler can read verified"
  on public.companies for select
  using (
    public.current_user_role() = 'recycler'
    and verification_status = 'verified'
  );

-- Company owner can insert their company (during onboarding)
create policy "companies: owner can insert"
  on public.companies for insert
  with check (user_id = auth.uid());

-- Company owner can update their own company
create policy "companies: owner can update"
  on public.companies for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin can update (e.g. verification_status)
create policy "companies: admin can update"
  on public.companies for update
  using (public.is_admin());

-- No direct deletes
create policy "companies: no direct delete"
  on public.companies for delete
  using (false);

-- ------------------------------------------------------------
-- RECYCLERS RLS
-- ------------------------------------------------------------

-- Recycler owner can read their own record
create policy "recyclers: owner can read"
  on public.recyclers for select
  using (user_id = auth.uid());

-- Admin can read all
create policy "recyclers: admin can read all"
  on public.recyclers for select
  using (public.is_admin());

-- Companies can read verified recyclers (for marketplace)
create policy "recyclers: company can read verified"
  on public.recyclers for select
  using (
    public.current_user_role() = 'company'
    and verification_status = 'verified'
  );

-- Recycler owner can insert during onboarding
create policy "recyclers: owner can insert"
  on public.recyclers for insert
  with check (user_id = auth.uid());

-- Recycler owner can update their own record
create policy "recyclers: owner can update"
  on public.recyclers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin can update (e.g. verification_status)
create policy "recyclers: admin can update"
  on public.recyclers for update
  using (public.is_admin());

-- No direct deletes
create policy "recyclers: no direct delete"
  on public.recyclers for delete
  using (false);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard or via CLI)
-- These SQL statements create bucket config records.
-- Actual bucket creation is done via Supabase Storage API.
-- ============================================================
-- Buckets to create (via Dashboard or CLI):
--   regulation-docs   (private, admin upload only)
--   company-docs      (private, owner + admin)
--   listing-photos    (public read, company write)
--   pickup-evidence   (private, recycler + admin)
--   certificates      (public read, system write)

-- ============================================================
-- INDEXES
-- ============================================================

create index profiles_role_idx       on public.profiles(role);
create index profiles_company_id_idx on public.profiles(company_id);
create index profiles_recycler_id_idx on public.profiles(recycler_id);
create index companies_user_id_idx   on public.companies(user_id);
create index companies_verification_idx on public.companies(verification_status);
create index recyclers_user_id_idx   on public.recyclers(user_id);
create index recyclers_verification_idx on public.recyclers(verification_status);
