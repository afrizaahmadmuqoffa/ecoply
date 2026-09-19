"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { setupCompanyProfile } from "@/lib/supabase/actions/auth";
import type { CompanyOnboardingInput } from "@/lib/validators/auth";
import { INDUSTRY_OPTIONS, OTHER_INDUSTRY_VALUE } from "@/lib/constants/industries";
import MapSelector, {
  MapSelectorHandle,
} from "@/components/mapbox/MapSelector";
import IdNumberInput from "@/components/ui/IdNumberInput";
import { isValidNik, isValidNpwp, isValidNib } from "@/lib/utils/idnumbers";
import { Loader2, MapPin, AlertTriangle, ArrowRight } from "lucide-react";

const inputCls =
  "w-full px-4 py-3 bg-canvas border border-border rounded-xl text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all";

const labelCls =
  "block text-xs font-semibold text-ink uppercase tracking-wider mb-2";

export default function CompanyOnboardingForm() {
  const mapSelectorRef = useRef<MapSelectorHandle | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<
    "idle" | "geolocating" | "fetching-address"
  >("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const [form, setForm] = useState<CompanyOnboardingInput>({
    name: "",
    segment: undefined,
    industry: "",
    address: "",
    npwp: "",
    nib: "",
    nik: "",
    location_lat: undefined,
    location_lng: undefined,
    address_text: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customIndustry, setCustomIndustry] = useState("");

  const handleAutoDetect = async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation tidak didukung browser ini.");
      return;
    }

    setLoadingPhase("geolocating");
    setGeoError(null);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg = err?.message || "Pastikan izin lokasi browser diberikan";
      setGeoError(`Gagal mendeteksi lokasi: ${msg}`);
    } finally {
      setLoadingPhase("idle");
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.segment) {
      setError("Pilih segmen usaha Anda untuk melanjutkan.");
      setLoading(false);
      return;
    }

    if (
      !form.industry?.trim() ||
      (form.industry === OTHER_INDUSTRY_VALUE && !customIndustry.trim())
    ) {
      setError("Jenis industri wajib diisi.");
      setLoading(false);
      return;
    }

    if (form.segment === "umkm") {
      if (!isValidNik(form.nik || "")) {
        setError("NIK wajib diisi untuk UMKM (16 digit).");
        setLoading(false);
        return;
      }
    } else {
      if (!isValidNpwp(form.npwp || "")) {
        setError("Format NPWP tidak valid (15 atau 16 digit).");
        setLoading(false);
        return;
      }

      if (!isValidNib(form.nib || "")) {
        setError("NIB harus terdiri dari 13 digit angka.");
        setLoading(false);
        return;
      }
    }

    if (!form.address_text?.trim()) {
      setError("Alamat wajib diisi — klik lokasi pada peta.");
      setLoading(false);
      return;
    }

    const result = await setupCompanyProfile({
      ...form,
      industry:
        form.industry === OTHER_INDUSTRY_VALUE
          ? customIndustry.trim()
          : form.industry,
    });
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      setLoading(false);
    }
  }

  const isAutoDetectBusy = loadingPhase !== "idle";

  return (
    <div className="bg-surface rounded-[18px] shadow-[0_24px_48px_-12px_rgba(11,31,22,0.08)] border border-border p-8 sm:p-10">

      {/* Color-split headline */}
      <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-[1.08]">
        Profil <span className="text-sage">Perusahaan.</span>
      </h2>
      <p className="mt-3 text-sm text-muted mb-8">
        Data ini digunakan untuk proses verifikasi
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className={labelCls}>
            Nama Perusahaan <span className="text-sage-dark">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            placeholder="Nama perusahaan Anda"
          />
        </div>

        <div>
          <label className={labelCls}>
            Segmen Usaha <span className="text-sage-dark">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                { value: "umkm", label: "UMKM", desc: "Usaha kecil-menengah" },
                { value: "non_umkm", label: "Perusahaan (Menengah & Besar)", desc: "PT / menengah / emiten / besar" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, segment: opt.value }))}
                aria-pressed={form.segment === opt.value}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  form.segment === opt.value
                    ? "border-sage bg-mint/30 shadow-[0_12px_24px_-12px_rgba(11,31,22,0.12)]"
                    : "border-border bg-surface hover:border-sage/50"
                }`}
              >
                <p className="text-sm font-bold text-ink tracking-tight">
                  {opt.label}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="industry" className={labelCls}>
            Jenis Industri <span className="text-sage-dark">*</span>
          </label>
          <select
            id="industry"
            value={form.industry || ""}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            className={`${inputCls} bg-surface`}
          >
            <option value="" disabled>
              Pilih sektor industri
            </option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value={OTHER_INDUSTRY_VALUE}>
              Lainnya / Sektor Tidak Terdaftar
            </option>
          </select>
          {form.industry === OTHER_INDUSTRY_VALUE && (
            <input
              type="text"
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              required
              className={`${inputCls} mt-2`}
              placeholder="Tuliskan sektor industri Anda"
            />
          )}
        </div>

        {/* Location Picker - Langsung pakai MapSelector */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-3">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider">
              Lokasi Perusahaan <span className="text-sage-dark">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isAutoDetectBusy}
              className="px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-semibold text-sage-dark hover:border-sage hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              {isAutoDetectBusy ? (
                <>
                  <Loader2 className="animate-spin h-3 w-3" />
                  <span>
                    {loadingPhase === "geolocating"
                      ? "Mendeteksi..."
                      : "Mengambil alamat..."}
                  </span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3" />
                  Auto-detect lokasi
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-sage" />
            Klik di peta untuk memilih lokasi perusahaan Anda
          </p>

          <div className="border border-border rounded-xl overflow-hidden shadow-[0_16px_32px_-16px_rgba(11,31,22,0.12)]">
            <MapSelector
              ref={mapSelectorRef}
              initialLat={-6.2}
              initialLng={106.816666}
              loadingPhase={loadingPhase}
              onSelect={(lat, lng, address) => {
                setForm((f) => ({
                  ...f,
                  location_lat: lat,
                  location_lng: lng,
                  address_text: address || "",
                }));
              }}
            />
          </div>

          {/* Setelah MapSelector */}
          <input
            id="address"
            type="text"
            readOnly
            value={form.address_text || ""}
            placeholder="Alamat otomatis terisi dari lokasi yang dipilih di peta"
            className="mt-2 w-full px-4 py-3 border border-border rounded-xl text-sm bg-canvas/60 text-muted cursor-not-allowed focus:outline-none"
          />
          {!form.address_text &&
            form.location_lat !== undefined &&
            form.location_lng !== undefined && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <strong className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Alamat belum terdeteksi.
                </strong> Koordinat tersimpan:{" "}
                {form.location_lat.toFixed(6)}, {form.location_lng.toFixed(6)}.{" "}
                Alamat akan digenerate otomatis dari koordinat.
              </div>
            )}

          {geoError && <p className="mt-2 text-sm text-red-600">{geoError}</p>}
        </div>

        <IdNumberInput
          kind="npwp"
          label="NPWP"
          value={form.npwp || ""}
          onChange={(v) => setForm((f) => ({ ...f, npwp: v }))}
          required={form.segment !== "umkm"}
          optionalHint={form.segment === "umkm" ? "opsional" : undefined}
          size="lg"
        />

        <IdNumberInput
          kind="nib"
          label="NIB"
          value={form.nib || ""}
          onChange={(v) => setForm((f) => ({ ...f, nib: v }))}
          required={form.segment !== "umkm"}
          optionalHint={form.segment === "umkm" ? "opsional" : undefined}
          size="lg"
        />

        {form.segment === "umkm" && (
          <IdNumberInput
            kind="nik"
            label="NIK"
            value={form.nik || ""}
            onChange={(v) => setForm((f) => ({ ...f, nik: v }))}
            required
            size="lg"
          />
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-sage hover:bg-sage-dark text-white py-3.5 px-4 rounded-full text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(85,158,123,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Menyimpan...
            </>
          ) : (
            <>
              Simpan & Lanjutkan
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}