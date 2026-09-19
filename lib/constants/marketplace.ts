// Hierarchical material options per category
export const MATERIAL_OPTIONS: Record<string, string[]> = {
  Plastik: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'ABS', 'Campuran'],
  Kertas: ['HVS', 'Papan', 'Koran', 'Campuran'],
  Logam: ['Besi', 'Aluminium', 'Tembaga', 'Stainless', 'Campuran'],
  Kaca: ['Bening', 'Berwarna', 'Campuran'],
  Organik: ['Sisa Makanan', 'Kayu', 'Daun', 'Campuran'],
  Elektronik: ['PCB', 'Kabel', 'Baterai', 'Layar', 'Campuran'],
}

// Unit options per category (contextual)
export const UNIT_OPTIONS: Record<string, string[]> = {
  Plastik: ['kg', 'tonne'],
  Kertas: ['kg', 'tonne'],
  Logam: ['kg', 'tonne'],
  Kaca: ['kg', 'tonne'],
  Organik: ['kg', 'tonne'],
  Elektronik: ['kg', 'pcs'],
}

// All categories
export const CATEGORIES = Object.keys(MATERIAL_OPTIONS)

// Helper to get materials for a category
export function getMaterialsForCategory(category: string): string[] {
  return MATERIAL_OPTIONS[category] || []
}

// Helper to get units for a category
export function getUnitsForCategory(category: string): string[] {
  return UNIT_OPTIONS[category] || ['kg']
}