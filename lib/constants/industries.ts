// Daftar sektor industri (klasifikasi IDX / POJK 51) untuk form profil perusahaan

export const INDUSTRY_OPTIONS = [
  {
    value: 'Consumer Goods',
    label: 'Consumer Goods (Barang Konsumsi)',
  },
  {
    value: 'Extractives & Minerals Processing',
    label: 'Extractives & Minerals Processing (Ekstraksi & Pengolahan Mineral)',
  },
  {
    value: 'Financials',
    label: 'Financials (Keuangan)',
  },
  {
    value: 'Food & Beverage',
    label: 'Food & Beverage (Makanan & Minuman)',
  },
  {
    value: 'Health Care',
    label: 'Health Care (Pelayanan Kesehatan)',
  },
  {
    value: 'Infrastructure',
    label: 'Infrastructure (Infrastruktur & Utilitas)',
  },
  {
    value: 'Renewable Resources & Alternative Energy',
    label: 'Renewable Resources & Alternative Energy (Energi Terbarukan)',
  },
  {
    value: 'Resource Transformation',
    label: 'Resource Transformation (Transformasi Sumber Daya / Manufaktur Kimia)',
  },
  {
    value: 'Services',
    label: 'Services (Jasa & Layanan Publik)',
  },
  {
    value: 'Technology & Communications',
    label: 'Technology & Communications (Teknologi & Komunikasi)',
  },
  {
    value: 'Transportation',
    label: 'Transportation (Transportasi & Logistik)',
  },
] as const

// Nilai sentinel untuk opsi "Lainnya" di dropdown industri
export const OTHER_INDUSTRY_VALUE = '__other__'

export const OTHER_INDUSTRY_LABEL = 'Lainnya / Sektor Tidak Terdaftar'