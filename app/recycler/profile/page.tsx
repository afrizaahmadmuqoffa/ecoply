/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  Loader2,
  MapPin,
  Package,
  Plus,
  Power,
  Scale,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  getRecyclerDetails,
  upsertRecyclerDetails,
} from "@/lib/supabase/actions/recycler";
import { MATERIAL_OPTIONS, CATEGORIES } from "@/lib/constants/marketplace";
import MapSelector, {
  MapSelectorHandle,
} from "@/components/mapbox/MapSelector";
import type { Certification } from "@/lib/validators/recycler";
import { parsePostGISLocation } from "@/lib/utils/postgis";
import { SkeletonHero, SkeletonProfile } from "@/components/ui/skeletons";

export default function RecyclerProfilePage() {
  const router = useRouter();
  const mapSelectorRef = useRef<MapSelectorHandle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingCert, setViewingCert] = useState<Certification | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<
    "idle" | "geolocating" | "fetching-address"
  >("idle");

  const [formData, setFormData] = useState({
    full_name: "",
    name: "",
    npwp: "",
    nib: "",
    accepted_materials: [] as string[],
    capacity_per_month: "",
    capacity_unit: "kg",
    address_text: "",
    service_radius_km: 50,
    certifications: [] as Certification[],
    pending_certs: [] as { name: string; file: File }[],
    is_active: true,
    _geo_lat: undefined as number | undefined,
    _geo_lng: undefined as number | undefined,
  });

  useEffect(() => {
    async function load() {
      const { data, error } = await getRecyclerDetails();
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }

      if (data) {
        let lat: number | undefined;
        let lng: number | undefined;
        const coords = parsePostGISLocation(data.location);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }

        setFormData({
          full_name: data.full_name || "",
          name: data.name || "",
          npwp: (data as any).npwp || "",
          nib: (data as any).nib || "",
          accepted_materials: data.accepted_materials || [],
          capacity_per_month: data.capacity_per_month?.toString() || "",
          capacity_unit: "kg",
          address_text: (data as any).address_text || "",
          service_radius_km: data.service_radius_km || 50,
          certifications: (data.certifications || []) as Certification[],
          pending_certs: [],
          is_active: data.is_active ?? true,
          _geo_lat: lat,
          _geo_lng: lng,
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      _geo_lat: lat,
      _geo_lng: lng,
      address_text: address || "",
    }));
  };

  const handleAutoDetect = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung browser ini.");
      return;
    }

    setLoadingPhase("geolocating");
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        },
      );

      const { latitude, longitude } = position.coords;
      setLoadingPhase("fetching-address");

      if (mapSelectorRef.current) {
        await mapSelectorRef.current.flyTo(latitude, longitude);
      }
    } catch (err: any) {
      console.error("❌ Geolocation GAGAL:", err);
      const msg = err?.message || "Pastikan izin lokasi browser diberikan";
      setError(`Gagal mendeteksi lokasi: ${msg}`);
    } finally {
      setLoadingPhase("idle");
    }
  };

  const getMaterialKey = (category: string, material: string) =>
    `${category}:${material}`;

  const isMaterialSelected = (category: string, material: string) =>
    formData.accepted_materials.includes(getMaterialKey(category, material));

  const toggleMaterial = (category: string, material: string) => {
    const key = getMaterialKey(category, material);
    setFormData((prev) => ({
      ...prev,
      accepted_materials: prev.accepted_materials.includes(key)
        ? prev.accepted_materials.filter((m) => m !== key)
        : [...prev.accepted_materials, key],
    }));
  };

  const addPendingCert = (name: string, file: File) => {
    if (formData.pending_certs.length + formData.certifications.length >= 10) {
      setError("Maksimal 10 sertifikasi");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      pending_certs: [...prev.pending_certs, { name, file }],
    }));
  };

  const removePendingCert = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pending_certs: prev.pending_certs.filter((_, i) => i !== index),
    }));
  };

  const removeExistingCert = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData._geo_lat || !formData._geo_lng) {
      setError("Silakan pilih lokasi fasilitas di peta.");
      return;
    }

    if (formData.accepted_materials.length === 0) {
      setError("Pilih minimal 1 jenis material yang diterima.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Nama fasilitas wajib diisi.");
      return;
    }

    if (!/^\d{13}$/.test(formData.nib.trim())) {
      setError("NIB harus terdiri dari 13 digit angka.");
      return;
    }

    if (
      !/^(?:\d{15}|\d{16})$/.test(formData.npwp.trim().replace(/\D/g, ""))
    ) {
      setError("Format NPWP tidak valid (15 atau 16 digit).");
      return;
    }

    if (formData.pending_certs.some((c) => !c.name.trim())) {
      setError("Nama sertifikasi belum diisi untuk semua file.");
      return;
    }

    setSaving(true);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name.trim());
    formDataObj.append("full_name", formData.full_name.trim());
    formDataObj.append("npwp", formData.npwp.trim());
    formDataObj.append("nib", formData.nib.trim());
    formData.accepted_materials.forEach((m) =>
      formDataObj.append("accepted_materials", m),
    );
    formDataObj.append("capacity_per_month", formData.capacity_per_month);
    formDataObj.append("capacity_unit", formData.capacity_unit);
    formDataObj.append("location_lat", formData._geo_lat.toString());
    formDataObj.append("location_lng", formData._geo_lng.toString());
    formDataObj.append(
      "address_text",
      formData.address_text.trim(),
    );
    formDataObj.append(
      "service_radius_km",
      formData.service_radius_km.toString(),
    );
    formDataObj.append("is_active", formData.is_active.toString());
    formDataObj.append(
      "certifications",
      JSON.stringify(formData.certifications),
    );

    formData.pending_certs.forEach((c) => {
      formDataObj.append("cert_files", c.file);
      formDataObj.append("cert_names", c.name);
    });

    const result = await upsertRecyclerDetails(formDataObj);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    if (result.reopened) {
      setSuccess(
        "Profil diperbarui. Akun dikirim kembali untuk ditinjau admin.",
      );
      toast.success("Profil diperbarui. Akun dikirim kembali untuk ditinjau admin.");
      setTimeout(() => router.push("/verify/blocked"), 1400);
      return;
    }

    const { data: refreshedData } = await getRecyclerDetails();
    if (refreshedData) {
      setFormData((prev) => ({
        ...prev,
        certifications: (refreshedData.certifications || []) as Certification[],
        pending_certs: [],
      }));
    }

    setSuccess("Profil fasilitas berhasil disimpan!");
    toast.success("Profil fasilitas berhasil disimpan!");
    setTimeout(() => setSuccess(null), 3000);
    router.refresh();
  };

  const isAutoDetectBusy = loadingPhase !== "idle";
  const totalSelected = formData.accepted_materials.length;

  if (loading) {
    return (
      <div className="animate-fade-in">
        <SkeletonHero />
        <div className="space-y-6">
          <SkeletonProfile />
          <SkeletonProfile />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
          Fasilitas <span className="text-sage">Daur Ulang.</span>
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl">
          Kelola profil fasilitas Anda untuk matching otomatis dengan listing limbah perusahaan. Pastikan data akurat untuk kepercayaan lebih tinggi.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="text-xs text-red-800 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-6 bg-mint border border-sage/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-sm font-semibold text-sage-dark">Berhasil</p>
            <p className="text-xs text-sage-dark mt-0.5 leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* === 02 — DATA AKUN === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Data Akun
              </span>
              <p className="text-xs text-muted mt-0.5">Identitas pemilik akun</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Nama lengkap pemilik akun"
            />
          </div>
        </div>

        {/* === 03 — IDENTITAS FASILITAS === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Identitas Fasilitas
              </span>
              <p className="text-xs text-muted mt-0.5">Nama yang ditampilkan di marketplace</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
              Nama Fasilitas <span className="text-sage-dark">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
              placeholder="Contoh: CV Recycler Nusantara"
            />
          </div>
        </div>

        {/* === 04 — IDENTITAS PAJAK === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Identitas Pajak
              </span>
              <p className="text-xs text-muted mt-0.5">
                NIB &amp; NPWP wajib untuk dokumen transaksi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                NPWP <span className="text-sage-dark">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.npwp}
                onChange={(e) =>
                  setFormData({ ...formData, npwp: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="NPWP (15/16 digit)"
              />
              <p className="text-[10px] text-muted mt-1.5">
                Contoh: 01.234.567.8-901.234
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-ink mb-1.5">
                NIB <span className="text-sage-dark">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.nib}
                onChange={(e) =>
                  setFormData({ ...formData, nib: e.target.value })
                }
                required
                pattern="[0-9]{13}"
                maxLength={13}
                className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                placeholder="13 digit NIB"
                title="NIB terdiri dari 13 digit angka"
              />
              <p className="text-[10px] text-muted mt-1.5">
                Nomor Induk Berusaha (OSS) — 13 digit angka
              </p>
            </div>
          </div>
        </div>

        {/* === 05 — MATERIAL DITERIMA === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                  Material Diterima <span className="text-sage">*</span>
                </span>
                <p className="text-xs text-muted mt-0.5">Jenis material yang dapat diproses</p>
              </div>
            </div>
            {totalSelected > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-sage text-white text-[10px] font-bold tracking-wider uppercase rounded-full flex-shrink-0 shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                {totalSelected} Dipilih
              </span>
            )}
          </div>

          <div className="space-y-5">
            {CATEGORIES.map((category) => (
              <div key={category}>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2.5">
                  {category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_OPTIONS[category].map((material) => {
                    const selected = isMaterialSelected(category, material);
                    return (
                      <button
                        key={getMaterialKey(category, material)}
                        type="button"
                        onClick={() => toggleMaterial(category, material)}
                        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          selected
                            ? "bg-sage text-white shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)] -translate-y-0.5"
                            : "bg-canvas border border-border text-ink hover:border-sage/40 hover:text-sage-dark"
                        }`}
                      >
                        {selected && (
                          <Check className="w-3 h-3" strokeWidth={3} />
                        )}
                        {material}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {totalSelected === 0 && (
            <div className="mt-5 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-amber-800 leading-relaxed">
                Pilih minimal 1 jenis material yang dapat diproses oleh fasilitas Anda.
              </p>
            </div>
          )}
        </div>

        {/* === 06 — KAPASITAS & RADIUS === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Kapasitas & Radius
              </span>
              <p className="text-xs text-muted mt-0.5">Kapasitas pengolahan dan jangkauan layanan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kapasitas */}
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-sage text-white flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink">
                  Kapasitas per Bulan
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.capacity_per_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity_per_month: e.target.value,
                    })
                  }
                  className="col-span-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  placeholder="5000"
                />
                <select
                  value={formData.capacity_unit}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_unit: e.target.value })
                  }
                  className="px-2 py-2 bg-surface border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                </select>
              </div>
              {formData.capacity_unit === "ton" && (
                <p className="text-[10px] text-muted mt-2">
                  Nilai ton akan dikonversi otomatis ke kg saat disimpan.
                </p>
              )}
            </div>

            {/* Radius */}
            <div className="bg-canvas/40 border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-sage text-white flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink">
                  Radius Layanan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.service_radius_km}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      service_radius_km: parseInt(e.target.value) || 1,
                    })
                  }
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                />
                <span className="text-xs font-bold text-muted px-2">km</span>
              </div>
              <p className="text-[10px] text-muted mt-2">
                Min: 1 km · Max: 1000 km
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[11px] text-muted">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p>Listing di luar radius ini tidak akan muncul di feed Anda</p>
          </div>
        </div>

        {/* === 07 — LOKASI === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                  Lokasi Fasilitas <span className="text-sage">*</span>
                </span>
                <p className="text-xs text-muted mt-0.5">Klik peta atau gunakan Auto-Detect</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isAutoDetectBusy}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex-shrink-0"
            >
              {isAutoDetectBusy && (
                <Loader2 className="animate-spin w-3.5 h-3.5" />
              )}
              {loadingPhase === "geolocating"
                ? "Mendeteksi..."
                : loadingPhase === "fetching-address"
                  ? "Mengambil alamat..."
                  : "Auto-Detect"}
            </button>
          </div>

          <div className="border border-border rounded-[18px] overflow-hidden shadow-inner">
            <MapSelector
              ref={mapSelectorRef}
              initialLat={formData._geo_lat || -6.2}
              initialLng={formData._geo_lng || 106.816666}
              loadingPhase={loadingPhase}
              onSelect={handleLocationSelect}
            />
          </div>

          {formData._geo_lat != null && formData._geo_lng != null ? (
            <div className="mt-4 p-3 bg-mint border border-sage/30 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-sage-dark flex-shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-sage-dark font-mono font-semibold">
                Lat: {formData._geo_lat.toFixed(6)}, Lng: {formData._geo_lng.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-amber-800 leading-relaxed">
                Pilih lokasi fasilitas di peta atau gunakan Auto-Detect sebelum menyimpan.
              </p>
            </div>
          )}
        </div>

        {/* === 08 — SERTIFIKASI === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Sertifikasi
              </span>
              <p className="text-xs text-muted mt-0.5">
                Upload dokumen bukti <span className="text-muted/70">(opsional)</span> · PDF/JPG/PNG · maks 5MB
              </p>
            </div>
          </div>

          {/* Existing certifications */}
          {formData.certifications.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2">
                Sudah Tersimpan
              </p>
              {formData.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-canvas border border-border rounded-xl hover:border-sage/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
<BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink tracking-tight truncate">
                        {cert.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 tabular-nums">
                      Disimpan{" "}
                      {new Date(cert.uploaded_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingCert(cert)}
                    className="group inline-flex items-center gap-1 px-3 py-1.5 bg-sage hover:bg-sage-dark text-white text-xs font-semibold rounded-full transition-all hover:-translate-y-0.5"
                  >
                    Lihat
<Eye className="w-3 h-3" strokeWidth={2} />
                    </button>
                  <button
                    type="button"
                    onClick={() => removeExistingCert(index)}
                    className="w-9 h-9 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors"
                    title="Hapus sertifikasi"
                  >
<Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending certifications */}
          {formData.pending_certs.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" strokeWidth={2.5} />
                Akan Diupload Saat Simpan
              </p>
              {formData.pending_certs.map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
<Clock className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink tracking-tight truncate">
                      {cert.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 truncate">
                      {cert.file.name} · {(cert.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingCert(index)}
                    className="w-9 h-9 rounded-full hover:bg-red-50 text-muted hover:text-red-600 flex items-center justify-center transition-colors"
                    title="Hapus"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <CertificationAdder
            onAdd={addPendingCert}
            disabled={
              formData.pending_certs.length + formData.certifications.length >= 10
            }
          />
        </div>

        {/* === 09 — STATUS AKTIF === */}
        <div className="bg-surface border border-border rounded-[18px] p-6 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
              <Power className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <div>
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block">
                Status Fasilitas
              </span>
              <p className="text-xs text-muted mt-0.5">Kontrol ketersediaan untuk menerima limbah</p>
            </div>
          </div>

          <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
            formData.is_active
              ? 'bg-mint/30 border-sage/30'
              : 'bg-canvas/40 border-border hover:border-sage/40'
          }`}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="mt-0.5 w-4 h-4 text-sage border-border rounded focus:ring-sage"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                Fasilitas {formData.is_active ? 'Aktif' : 'Tidak Aktif'} menerima limbah
                {formData.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage text-white text-[9px] font-bold tracking-wider uppercase rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Online
                  </span>
                )}
              </p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {formData.is_active
                  ? 'Listing dari perusahaan akan muncul di feed Anda sesuai radius layanan.'
                  : 'Nonaktifkan jika sedang tidak menerima material baru. Anda tetap dapat mengakses marketplace.'}
              </p>
            </div>
          </label>
        </div>

        {/* === SUBMIT === */}
        <button
          type="submit"
          disabled={saving}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Simpan Profil Fasilitas
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      {/* === MODAL: Preview Sertifikasi === */}
      {viewingCert && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-[22px] max-w-2xl w-full overflow-hidden shadow-[0_32px_64px_-16px_rgba(11,31,22,0.4)]">
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 rounded-lg bg-sage/20 text-sage-dark flex items-center justify-center flex-shrink-0">
<BadgeCheck className="w-5 h-5" strokeWidth={1.8} />
                  </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-dark block mb-0.5">
                    Sertifikasi
                  </span>
                  <h3 className="text-base font-extrabold text-ink tracking-tight truncate">
                    {viewingCert.name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 tabular-nums">
                    Diupload{" "}
                    {new Date(viewingCert.uploaded_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCert(null)}
                className="w-9 h-9 rounded-full hover:bg-canvas text-muted hover:text-ink flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 bg-canvas flex justify-center items-center min-h-[300px] max-h-[60vh] overflow-hidden">
              {viewingCert.file_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewingCert.file_url}
                  alt={viewingCert.name}
                  className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-[0_8px_16px_-8px_rgba(11,31,22,0.12)]"
                />
              ) : (
                <iframe
                  src={viewingCert.file_url}
                  title={viewingCert.name}
                  className="w-full h-[55vh] rounded-xl border border-border bg-surface shadow-inner"
                />
              )}
            </div>

            <div className="px-6 py-5 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingCert(null)}
                className="px-5 py-2.5 border border-border hover:border-sage hover:text-sage-dark text-ink text-sm font-semibold rounded-full transition-all"
              >
                Tutup
              </button>
              <a
                href={viewingCert.file_url}
                download
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(85,158,123,0.4)]"
              >
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === SUB-COMPONENT: Certification Adder ===
function CertificationAdder({
  onAdd,
  disabled,
}: {
  onAdd: (name: string, file: File) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!name.trim() || !file) return;
    onAdd(name.trim(), file);
    setName("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="pt-5 border-t border-border">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-3">
        Tambah Sertifikasi Baru
      </p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama sertifikasi (contoh: ISO 14001, PROPER Hijau)"
          className="w-full px-4 py-2.5 bg-canvas border border-border rounded-xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all disabled:opacity-50"
          disabled={disabled}
        />

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="cert_file_input"
            disabled={disabled}
          />
          <label
            htmlFor="cert_file_input"
            className={`flex-1 px-4 py-3 border-2 border-dashed rounded-xl text-sm cursor-pointer text-center transition-all ${
              disabled
                ? "border-border opacity-50 cursor-not-allowed"
                : file
                  ? "border-sage bg-mint/20"
                  : "border-border hover:border-sage/50 hover:bg-canvas"
            }`}
          >
            {file ? (
              <span className="text-sage-dark font-semibold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" strokeWidth={2.5} />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            ) : (
              <span className="text-muted flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" strokeWidth={2} />
                Pilih file bukti (PDF/JPG/PNG, maks 5MB)
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !name.trim() || !file}
            className="group px-5 py-3 bg-sage hover:bg-sage-dark text-white text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Tambah
          </button>
        </div>

        {disabled && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-amber-800 leading-relaxed">
              Maksimal 10 sertifikasi tercapai. Hapus salah satu untuk menambah baru.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}