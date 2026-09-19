/**
 * Compliance audit areas + RAG retrieval queries.
 *
 * `name` MUST match the area enum in the Gemini response schema
 * (see lib/gemini/compliance.ts — built from this array to avoid drift).
 * `query` is the embedding query used to retrieve EVIDENCE from the
 * company document (not from the regulation knowledge base).
 */

export type AuditAreaConfig = {
  id: string
  name: string
  query: string
  /**
   * Plain-token expression for Postgres `to_tsquery` (OR via `|`,
   * e.g. `"limbah | waste | daur ulang"`). Zero Gemini tokens — used
   * to retrieve company-document evidence via full-text search.
   */
  search_terms: string
}

export const AUDIT_AREAS: AuditAreaConfig[] = [
  {
    id: "company_profile",
    name: "Profil dan Skala Usaha",
    query:
      "profil perusahaan nama lokasi skala usaha segmen bisnis jumlah karyawan total pendapatan wilayah operasional kepemilikan struktur usaha",
    search_terms:
      "profil | skala | usaha | perusahaan | operasional | karyawan | pendapatan | company | profile",
  },
  {
    id: "sustainability_strategy",
    name: "Strategi dan Kebijakan Keberlanjutan",
    query:
      "strategi keberlanjutan visi misi kebijakan komitmen keberlanjutan tujuan pembangunan berkelanjutan arah kebijakan ESG inisiatif",
    search_terms:
      "strategi | visi | misi | kebijakan | keberlanjutan | komitmen | sustainability | strategy",
  },
  {
    id: "sustainability_governance",
    name: "Tata Kelola Keberlanjutan",
    query:
      "tata kelola keberlanjutan dewan direksi dewan komisaris struktur pengelolaan penanggung jawab laporan keberlanjutan komite keberlanjutan",
    search_terms:
      "tata | kelola | dewan | direksi | komisaris | keberlanjutan | governance",
  },
  {
    id: "environmental_energy",
    name: "Kinerja Lingkungan — Energi",
    query:
      "pemakaian energi konsumsi listrik konsumsi BBM intensitas energi energi terbarukan efisiensi energi jumlah energi",
    search_terms:
      "energi | listrik | bahan | bakar | efisiensi | intensitas | terbarukan | energy | renewable",
  },
  {
    id: "ghg_inventory",
    name: "Inventarisasi Emisi GRK dan Strategi Iklim",
    query:
      "emisi gas rumah kaca inventarisasi emisi scope 1 scope 2 scope 3 perhitungan emisi ton CO2e target penurunan emisi net zero strategi iklim",
    search_terms:
      "emisi | grk | karbon | inventarisasi | target | penurunan | scope | emission | carbon | gas",
  },
  {
    id: "climate_resilience",
    name: "Analisis Ketahanan Iklim dan Skenario",
    query:
      "ketahanan iklim risiko iklim skenario perubahan iklim dampak fisik dampak transisi adaptasi mitigasi perubahan iklim",
    search_terms:
      "iklim | ketahanan | risiko | skenario | adaptasi | mitigasi | climate | perubahan",
  },
  {
    id: "waste_circular",
    name: "Pengelolaan Limbah dan Ekonomi Sirkular",
    query:
      "pengelolaan limbah limbah B3 limbah padat timbulan limbah pengolahan limbah daur ulang ekonomi sirkular pengurangan limbah",
    search_terms:
      "limbah | daur | ulang | sampah | sirkular | b3 | waste | circular",
  },
  {
    id: "water_management",
    name: "Pengelolaan Air",
    query:
      "pengelolaan air penggunaan air konsumsi air pengolahan air limbah resiko air kualitas air ketersediaan air",
    search_terms:
      "air | limbah | pengolahan | konsumsi | water | wastewater",
  },
  {
    id: "social_labor",
    name: "Kinerja Sosial dan Ketenagakerjaan",
    query:
      "ketenagakerjaan jumlah karyawan pelatihan pengembangan K3 keselamatan kerja kesejahteraan pekerja hubungan industrial non diskriminasi tenaga kerja",
    search_terms:
      "karyawan | tenaga | kerja | pelatihan | keselamatan | k3 | employee | workforce | pekerja",
  },
  {
    id: "supply_chain",
    name: "Kinerja Rantai Pasok",
    query:
      "rantai pasok pemasok vendor keberlanjutan pemasok due diligence pemasok kriteria seleksi pemasok pemasok lokal",
    search_terms:
      "pemasok | vendor | rantai | supplier | supply | sourcing | procurement",
  },
  {
    id: "data_assurance",
    name: "Tata Kelola Data dan Assurance Independen",
    query:
      "tata kelola data verifikasi assurance independen auditor pihak ketiga akurasi data kualitas data pengendalian data laporan",
    search_terms:
      "verifikasi | assurance | auditor | tata | kelola | kualitas | data | verification",
  },
  {
    id: "sustainable_finance",
    name: "Kinerja Keuangan Berkelanjutan",
    query:
      "kinerja keuangan pendapatan revenue biaya keberlanjutan investasi keberlanjutan belanja lingkungan keuangan berkelanjutan dampak ekonomi",
    search_terms:
      "keuangan | pendapatan | revenue | biaya | investasi | finance",
  },
]

export const AUDIT_AREA_NAMES = AUDIT_AREAS.map((a) => a.name)