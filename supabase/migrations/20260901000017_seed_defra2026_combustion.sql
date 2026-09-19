-- ============================================================
-- SEED: DEFRA 2026 Combustion Emission Factors
-- Source: UK Government GHG Conversion Factors 2026 (Flat File)
-- All values in kg CO2e per unit
-- created_by = NULL (system seed)
-- ============================================================

insert into public.ef_combustion (
  scope_category, fuel_name, unit,
  ef_scope1_co2e, ef_outside_scope_co2e,
  ef_co2, ef_ch4, ef_n2o,
  is_fossil, source, year_reference
) values

-- ── Liquid Fuels ──────────────────────────────────────────

-- Diesel (Mineral)
('stationary', 'Diesel', 'liter', 2.66155, 0, 2.62818, 0.00029, 0.03308, true, 'DEFRA 2026', 2026),
('stationary', 'Diesel', 'kg',    3.20391, 0, 3.16433, 0.00035, 0.03923, true, 'DEFRA 2026', 2026),
('mobile',     'Diesel', 'liter', 2.66155, 0, 2.62818, 0.00029, 0.03308, true, 'DEFRA 2026', 2026),
('mobile',     'Diesel', 'kg',    3.20391, 0, 3.16433, 0.00035, 0.03923, true, 'DEFRA 2026', 2026),

-- Petrol / Gasoline
('stationary', 'Petrol', 'liter', 2.35372, 0, 2.33955, 0.00820, 0.00597, true, 'DEFRA 2026', 2026),
('stationary', 'Petrol', 'kg',    3.15408, 0, 3.13500, 0.01104, 0.00804, true, 'DEFRA 2026', 2026),
('mobile',     'Petrol', 'liter', 2.35372, 0, 2.33955, 0.00820, 0.00597, true, 'DEFRA 2026', 2026),
('mobile',     'Petrol', 'kg',    3.15408, 0, 3.13500, 0.01104, 0.00804, true, 'DEFRA 2026', 2026),

-- Heavy Fuel Oil (HFO)
('stationary', 'Heavy Fuel Oil (HFO)', 'liter', 3.10202, 0, 3.06194, 0.00140, 0.03868, true, 'DEFRA 2026', 2026),
('stationary', 'Heavy Fuel Oil (HFO)', 'kg',    3.15475, 0, 3.11399, 0.00142, 0.03934, true, 'DEFRA 2026', 2026),
('mobile',     'Heavy Fuel Oil (HFO)', 'liter', 3.10202, 0, 3.06194, 0.00140, 0.03868, true, 'DEFRA 2026', 2026),
('mobile',     'Heavy Fuel Oil (HFO)', 'kg',    3.15475, 0, 3.11399, 0.00142, 0.03934, true, 'DEFRA 2026', 2026),

-- Light Fuel Oil / Kerosene (Burning Oil)
('stationary', 'Kerosene (Burning Oil)', 'liter', 2.54016, 0, 2.52782, 0.00674, 0.00559, true, 'DEFRA 2026', 2026),
('stationary', 'Kerosene (Burning Oil)', 'kg',    3.16504, 0, 3.14967, 0.00840, 0.00697, true, 'DEFRA 2026', 2026),
('mobile',     'Kerosene (Burning Oil)', 'liter', 2.54016, 0, 2.52782, 0.00674, 0.00559, true, 'DEFRA 2026', 2026),
('mobile',     'Kerosene (Burning Oil)', 'kg',    3.16504, 0, 3.14967, 0.00840, 0.00697, true, 'DEFRA 2026', 2026),

-- LPG
('stationary', 'LPG', 'liter', 1.55713, 0, 1.55491, 0.00136, 0.00086, true, 'DEFRA 2026', 2026),
('stationary', 'LPG', 'kg',    2.93936, 0, 2.93518, 0.00255, 0.00163, true, 'DEFRA 2026', 2026),
('mobile',     'LPG', 'liter', 1.55713, 0, 1.55491, 0.00136, 0.00086, true, 'DEFRA 2026', 2026),
('mobile',     'LPG', 'kg',    2.93936, 0, 2.93518, 0.00255, 0.00163, true, 'DEFRA 2026', 2026),

-- Biodiesel B100 (Non-Fossil) — Scope 1 = CH4+N2O | Outside = biogenic CO2
('stationary', 'Biodiesel B100', 'liter', 0.16751, 2.39000, 2.39000, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Biodiesel B100', 'kg',    0.18822, 2.68000, 2.68000, null, null, false, 'DEFRA 2026', 2026),
('mobile',     'Biodiesel B100', 'liter', 0.16751, 2.39000, 2.39000, null, null, false, 'DEFRA 2026', 2026),
('mobile',     'Biodiesel B100', 'kg',    0.18822, 2.68000, 2.68000, null, null, false, 'DEFRA 2026', 2026),

-- Bioethanol E100 (Non-Fossil)
('stationary', 'Bioethanol E100', 'liter', 0.00901, 1.52000, 1.52000, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Bioethanol E100', 'kg',    0.01135, 1.91000, 1.91000, null, null, false, 'DEFRA 2026', 2026),
('mobile',     'Bioethanol E100', 'liter', 0.00901, 1.52000, 1.52000, null, null, false, 'DEFRA 2026', 2026),
('mobile',     'Bioethanol E100', 'kg',    0.01135, 1.91000, 1.91000, null, null, false, 'DEFRA 2026', 2026),

-- ── Gaseous Fuels ─────────────────────────────────────────

-- Natural Gas (Stationary)
('stationary', 'Natural Gas', 'm³',  2.02633, 0, 2.02231, 0.00307, 0.00095, true, 'DEFRA 2026', 2026),
('stationary', 'Natural Gas', 'kWh', 0.20199, 0, 0.20158, 0.00031, 0.00010, true, 'DEFRA 2026', 2026),

-- CNG (Mobile)
('mobile', 'CNG', 'kg', 2.50772, 0, 2.50268, 0.00385, 0.00119, true, 'DEFRA 2026', 2026),

-- LNG (Mobile)
('mobile', 'LNG', 'kg', 2.53685, 0, 2.53181, 0.00385, 0.00119, true, 'DEFRA 2026', 2026),

-- Biogas (Non-Fossil)
('stationary', 'Biogas', 'kg',  0.00123, 1.10567, 1.10567, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Biogas', 'kWh', 0.00022, 0.19902, 0.19902, null, null, false, 'DEFRA 2026', 2026),

-- Biomethane Compressed (Non-Fossil)
('stationary', 'Biomethane', 'kg', 0.00521, 2.71000, 2.71000, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Biomethane', 'GJ', 0.10625, 55.28000, 55.28000, null, null, false, 'DEFRA 2026', 2026),

-- ── Solid Fuels ───────────────────────────────────────────

-- Coal (Industrial)
('stationary', 'Coal (Industrial)', 'kg',    2.41504,    0, 2.39047, 0.00764, 0.01693, true, 'DEFRA 2026', 2026),
('stationary', 'Coal (Industrial)', 'tonne', 2415.03994, 0, 2390.47, 7.63840, 16.93154, true, 'DEFRA 2026', 2026),

-- Coking Coal
('stationary', 'Coking Coal', 'kg',    3.16465,    0, 3.14416, 0.00847, 0.01202, true, 'DEFRA 2026', 2026),
('stationary', 'Coking Coal', 'tonne', 3164.65002, 0, 3144.16, 8.46720, 12.02282, true, 'DEFRA 2026', 2026),

-- Wood Logs (Non-Fossil)
('stationary', 'Wood Logs', 'kg',    0.04874,  1.43623, 1.43623, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Wood Logs', 'tonne', 48.73751, 1436.23, 1436.23, null, null, false, 'DEFRA 2026', 2026),

-- Wood Pellets (Non-Fossil)
('stationary', 'Wood Pellets', 'kg',    0.05725,  1.67718, 1.67718, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Wood Pellets', 'tonne', 57.25249, 1677.18, 1677.18, null, null, false, 'DEFRA 2026', 2026),

-- Biomass / Agricultural Residue (Proxy: Grass/Straw for Palm Shell, Bagasse, Rice Husk)
('stationary', 'Biomass (Agricultural Residue)', 'kg',    0.04689,  1.28725, 1.28725, null, null, false, 'DEFRA 2026', 2026),
('stationary', 'Biomass (Agricultural Residue)', 'tonne', 46.89059, 1287.25, 1287.25, null, null, false, 'DEFRA 2026', 2026),

-- ── Mobile: Aviation & Marine ─────────────────────────────

-- Aviation Turbine Fuel / Avtur (Fossil)
('mobile', 'Aviation Fuel (Avtur)', 'liter', 2.54269, 0, 2.51973, 0.00176, 0.02120, true, 'DEFRA 2026', 2026),
('mobile', 'Aviation Fuel (Avtur)', 'kg',    3.17837, 0, 3.14967, 0.00220, 0.02650, true, 'DEFRA 2026', 2026),

-- Bio-Avtur / Renewable Aviation Fuel (Non-Fossil)
('mobile', 'Bio-Avtur (Renewable)', 'liter', 0.02533, 2.51000, 2.51000, null, null, false, 'DEFRA 2026', 2026),
('mobile', 'Bio-Avtur (Renewable)', 'kg',    0.03167, 3.15000, 3.15000, null, null, false, 'DEFRA 2026', 2026),

-- Aviation Gasoline / Avgas (Fossil)
('mobile', 'Aviation Gasoline (Avgas)', 'liter', 2.33116, 0, 2.28297, 0.02885, 0.01934, true, 'DEFRA 2026', 2026),
('mobile', 'Aviation Gasoline (Avgas)', 'kg',    3.19369, 0, 3.12767, 0.03952, 0.02650, true, 'DEFRA 2026', 2026),

-- Marine Fuel Oil / MFO / Bunker (Fossil)
('mobile', 'Marine Fuel Oil (MFO)', 'liter', 3.10202, 0, 3.06194, 0.00140, 0.03868, true, 'DEFRA 2026', 2026),
('mobile', 'Marine Fuel Oil (MFO)', 'kg',    3.15475, 0, 3.11399, 0.00142, 0.03934, true, 'DEFRA 2026', 2026),

-- Marine Gas Oil / MGO (Fossil)
('mobile', 'Marine Gas Oil (MGO)', 'liter', 2.77139, 0, 2.73782, 0.00077, 0.03280, true, 'DEFRA 2026', 2026),
('mobile', 'Marine Gas Oil (MGO)', 'kg',    3.24530, 0, 3.20599, 0.00091, 0.03841, true, 'DEFRA 2026', 2026)

on conflict (scope_category, fuel_name, unit) do nothing;
