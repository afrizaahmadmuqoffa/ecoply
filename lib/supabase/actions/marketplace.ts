"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createListingSchema,
  createBidSchema,
  updateListingStatusSchema,
  createRequestPickupSchema,
  confirmPickupSchema,
  recordPickupSchema,
  confirmFulfillmentSchema,
  issueCertificateSchema,
} from "@/lib/validators/marketplace";
import { parsePostGISLocation } from "@/lib/utils/postgis";

// 'dealing' hanya boleh dicapai lewat accept bid (acceptBid / respondToCompanyRequest).
// Perpindahan status manual dari open -> dealing tidak diizinkan.
// Setelah pickup dikonfirmasi ('confirmed'), listing TIDAK bisa dibatalkan.
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["cancelled"],
  dealing: ["confirmed", "cancelled"],
  confirmed: ["completed"],
  completed: [], // terminal state
  cancelled: [], // terminal state
};

export async function createWasteListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const photoFiles = formData.getAll("photos") as File[];
  const photoUrls: string[] = [];

  for (const file of photoFiles) {
    if (file.size === 0) continue;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("listing-photos")
      .upload(`${user.id}/${fileName}`, file);

    if (uploadError) {
      return { error: `Upload foto gagal: ${uploadError.message}` };
    }

    const { data: publicUrl } = supabase.storage
      .from("listing-photos")
      .getPublicUrl(`${user.id}/${fileName}`);

    photoUrls.push(publicUrl.publicUrl);
  }

  const parsed = createListingSchema.safeParse({
    material_type: formData.get("material_type"),
    category: formData.get("category"),
    weight: parseFloat(formData.get("weight") as string),
    unit: formData.get("unit"),
    location_lat: parseFloat(formData.get("location_lat") as string),
    location_lng: parseFloat(formData.get("location_lng") as string),
    address_text: formData.get("address_text"),
    pickup_instructions:
      (formData.get("pickup_instructions") as string) || undefined,

    // Objective criteria (convert string 'true'/'false' to boolean)
    is_sorted: formData.get("is_sorted") === "true",
    is_cleaned: formData.get("is_cleaned") === "true",
    is_mixed: formData.get("is_mixed") === "true",
    contaminant_note: (formData.get("contaminant_note") as string) || undefined,
    photos: photoUrls,
    pickup_schedule: (formData.get("pickup_schedule") as string) || undefined,
    free_for_pickup: formData.get("free_for_pickup") === "true",
  });

  if (!parsed.success) {
    console.error("Validation error:", parsed.error.issues);
    return { error: parsed.error.issues[0].message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return { error: "Company profile not found" };

  const location = `POINT(${parsed.data.location_lng} ${parsed.data.location_lat})`;

  const { data: listing, error } = await supabase
    .from("waste_listings")
    .insert({
      company_id: profile.company_id,
      material_type: parsed.data.material_type,
      category: parsed.data.category,
      weight: parsed.data.weight,
      unit: parsed.data.unit,
      address_text: parsed.data.address_text,
      pickup_instructions: parsed.data.pickup_instructions,
      is_sorted: parsed.data.is_sorted,
      is_cleaned: parsed.data.is_cleaned,
      is_mixed: parsed.data.is_mixed,
      contaminant_note: parsed.data.contaminant_note,
      photos: parsed.data.photos,
      pickup_schedule: parsed.data.pickup_schedule,
      free_for_pickup: parsed.data.free_for_pickup,
      location,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("DB insert error:", error);
    return { error: error.message };
  }
  return { data: listing };
}

export async function getCompanyListings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id)
    return { error: "Company profile not found", data: [] };

  const { data: listings, error } = await supabase
    .from("waste_listings")
    .select("*, companies(name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: listings };
}

export async function getRecyclerListings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) {
    return { error: 'Recycler profile not found', data: [] }
  }

  const { data: details } = await supabase
    .from('recycler_details')
    .select('location, service_radius_km, is_active, accepted_materials')
    .eq('recycler_id', profile.recycler_id)
    .maybeSingle()

  if (!details || !details.location || !details.service_radius_km) {
    return { error: null, data: [], needsProfileSetup: true }
  }

  const coords = parsePostGISLocation(details.location)
  if (!coords) {
    console.error('Failed to parse location:', details.location)
    return { error: 'Format lokasi fasilitas tidak valid', data: [] }
  }

  const { lat, lng } = coords
  const radiusKm = parseFloat(String(details.service_radius_km))
  const acceptedMaterials = (details.accepted_materials || []) as string[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listings, error } = await (supabase.rpc as any)(
    'get_listings_within_radius',
    {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      // Selalu kirim array (bukan null): array kosong → RPC tidak
      // menghasilkan listing, sehingga recycler yang belum memilih
      // material diterima tidak melihat SEMUA listing limbah.
      p_accepted_materials: acceptedMaterials,
      p_recycler_id: profile.recycler_id,  // ✅ Tambah parameter baru
    },
  )

  if (error) {
    console.error('PostGIS RPC error:', error)
    return { error: error.message, data: [] }
  }

  return {
    data: listings || [],
    filterInfo: {
      lat,
      lng,
      radius_km: radiusKm,
      is_active: details.is_active,
      accepted_materials_count: acceptedMaterials.length,
    },
    needsAcceptedMaterials: acceptedMaterials.length === 0,
  }
}

export async function createMarketplaceBid(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = createBidSchema.safeParse({
    listing_id: formData.get("listing_id"),
    price: formData.get("price")
      ? parseFloat(formData.get("price") as string)
      : null,
    note: formData.get("note"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("recycler_id")
    .eq("id", user.id)
    .single();

  if (!profile?.recycler_id) return { error: "Recycler profile not found" };

  // Listing harus masih open agar bisa bid
  const { data: listing } = await supabase
    .from("waste_listings")
    .select("status")
    .eq("id", parsed.data.listing_id)
    .single();

  if (!listing) return { error: "Listing tidak ditemukan" };
  if (listing.status !== "open") {
    return { error: "Listing sudah tidak menerima penawaran" };
  }

  // Cegah double-bid: sudah ada bid aktif dari recycler ini untuk listing ini
  const { data: existing } = await supabase
    .from("marketplace_bids")
    .select("id")
    .eq("listing_id", parsed.data.listing_id)
    .eq("recycler_id", profile.recycler_id)
    .eq("initiator", "recycler")
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      error: "Anda sudah mengirim bid untuk listing ini. Tunggu respons atau cek status bid di detail listing.",
    };
  }

  const { data: bid, error } = await supabase
    .from("marketplace_bids")
    .insert({
      listing_id: parsed.data.listing_id,
      recycler_id: profile.recycler_id,
      price: parsed.data.price,
      initiator: "recycler",
      note: parsed.data.note,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: bid };
}

export async function getCompanyBids() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id)
    return { error: "Company profile not found", data: [] };

  const { data: bids, error } = await supabase
    .from("marketplace_bids")
    .select(`
      *,
      waste_listings!inner(*)
    `)
    .eq("waste_listings.company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };

  // Nama recycler dibaca lewat view aman-PII (verified only)
  const recyclerIds = [
    ...new Set(
      (bids ?? [])
        .map((b) => b.recycler_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  let recyclerNames: Record<string, string> = {}
  if (recyclerIds.length > 0) {
    const { data: recyclers } = await supabase
      .from("view_recycler_public")
      .select("id, name")
      .in("id", recyclerIds)
    recyclerNames = Object.fromEntries(
      (recyclers ?? []).map((r) => [r.id, r.name]),
    )
  }

  const data = (bids ?? []).map((bid) => ({
    ...bid,
    recyclers: { name: recyclerNames[bid.recycler_id as string] ?? null },
  }))
return { data };
}

export async function updateListingStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateListingStatusSchema.safeParse({
    listing_id: formData.get("listing_id"),
    status: formData.get("status"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return { error: "Company profile not found" };

  // Fetch current listing untuk validasi ownership & state machine
  const { data: listing, error: fetchError } = await supabase
    .from("waste_listings")
    .select("company_id, status")
    .eq("id", parsed.data.listing_id)
    .single();

  if (fetchError || !listing) {
    return { error: "Listing tidak ditemukan" };
  }

  if (listing.company_id !== profile.company_id) {
    return { error: "Unauthorized to update this listing" };
  }

  // Validasi state machine transition
  const currentStatus = listing.status ?? "";
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(parsed.data.status)) {
    return {
      error: `Transisi status dari "${currentStatus}" ke "${parsed.data.status}" tidak diizinkan`,
    };
  }

  const { error } = await supabase
    .from("waste_listings")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.listing_id);

  if (error) return { error: error.message };
  return { success: true, newStatus: parsed.data.status };
}


// ============================================
// LISTING DETAIL (Company Owner)
// ============================================
export async function getListingDetail(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  // Fetch listing (verify ownership via company_id filter)
  const { data: listing, error: listingError } = await supabase
    .from('waste_listings')
    .select('*')
    .eq('id', listingId)
    .eq('company_id', profile.company_id)
    .single()

  if (listingError || !listing) return { error: 'Listing tidak ditemukan' }

  // Fetch bids + nama/status recycler lewat view aman-PII (verified only)
  const { data: bids, error: bidsError } = await supabase
    .from('marketplace_bids')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })

  if (bidsError) {
    console.error('Fetch bids error:', bidsError)
    return { error: bidsError.message }
  }

  const recyclerIds = [
    ...new Set(
      (bids ?? [])
        .map((b) => b.recycler_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  let recyclersById: Record<string, { id: string; name: string; verification_status: string }> = {}
  if (recyclerIds.length > 0) {
    const { data: recyclers } = await supabase
      .from('view_recycler_public')
      .select('id, name, verification_status')
      .in('id', recyclerIds)
    recyclersById = Object.fromEntries(
      (recyclers ?? []).map((r) => [r.id, r]),
    )
  }

  const bidsWithRecycler = (bids ?? []).map((bid) => ({
    ...bid,
    recyclers: bid.recycler_id
      ? (recyclersById[bid.recycler_id as string] ?? null)
      : null,
  }))

  return { data: { listing, bids: bidsWithRecycler } }
}

// ============================================
// ACCEPT BID
// ============================================
export async function acceptBid(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const bidId = formData.get('bid_id') as string
  if (!bidId) return { error: 'Bid ID tidak valid' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  // Fetch bid + verify ownership
  const { data: bid, error: bidError } = await supabase
    .from('marketplace_bids')
    .select('id, listing_id, status, recycler_id, waste_listings!inner(company_id, status)')
    .eq('id', bidId)
    .single()

  if (bidError || !bid) return { error: 'Bid tidak ditemukan' }

  const listing = bid.waste_listings as { company_id: string; status: string }
  if (listing.company_id !== profile.company_id) {
    return { error: 'Unauthorized: Anda bukan pemilik listing ini' }
  }

  if (bid.status !== 'pending') {
    return { error: 'Bid sudah diproses sebelumnya' }
  }

  // 1. Accept bid ini
  const { error: acceptError } = await supabase
    .from('marketplace_bids')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', bidId)

  if (acceptError) return { error: acceptError.message }

  // 2. Reject semua bid pending lain untuk listing yang sama
  await supabase
    .from('marketplace_bids')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('listing_id', bid.listing_id)
    .neq('id', bidId)
    .eq('status', 'pending')

  // 3. Update listing status ke "dealing"
  await supabase
    .from('waste_listings')
    .update({ status: 'dealing', updated_at: new Date().toISOString() })
    .eq('id', bid.listing_id)

  // 4. Buat thread chat (get-or-create) antara company & recycler
  const { data: existingThread } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('listing_id', bid.listing_id)
    .eq('company_id', profile.company_id)
    .eq('recycler_id', bid.recycler_id)
    .maybeSingle()

  if (!existingThread) {
    await supabase
      .from('chat_threads')
      .insert({
        listing_id: bid.listing_id,
        company_id: profile.company_id,
        recycler_id: bid.recycler_id,
      })
  }

  return { success: true }
}

// ============================================
// REJECT BID
// ============================================
export async function rejectBid(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const bidId = formData.get('bid_id') as string
  if (!bidId) return { error: 'Bid ID tidak valid' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  const { data: bid, error: bidError } = await supabase
    .from('marketplace_bids')
    .select('id, listing_id, status, waste_listings!inner(company_id)')
    .eq('id', bidId)
    .single()

  if (bidError || !bid) return { error: 'Bid tidak ditemukan' }

  const listing = bid.waste_listings as { company_id: string }
  if (listing.company_id !== profile.company_id) {
    return { error: 'Unauthorized: Anda bukan pemilik listing ini' }
  }

  const { error } = await supabase
    .from('marketplace_bids')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', bidId)

  if (error) return { error: error.message }
  return { success: true }
}

// ============================================
// LISTING DETAIL UNTUK RECYCLER
// ============================================
export async function getListingDetailForRecycler(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) return { error: 'Recycler profile not found' }

  // Fetch listing (+ company_id) lalu nama company via view aman-PII
  const { data: listingRow, error } = await supabase
    .from('waste_listings')
    .select('*, company_id')
    .eq('id', listingId)
    .single()

  if (error || !listingRow) return { error: 'Listing tidak ditemukan' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = listingRow as any

  // Fetch konteks recycler: material yang diterima + bid milik recycler
  // (paralel, sebelum gate material).
  const [recyclerDetails, myBid] = await Promise.all([
    supabase
      .from('recycler_details')
      .select('accepted_materials')
      .eq('recycler_id', profile.recycler_id)
      .maybeSingle(),
    supabase
      .from('marketplace_bids')
      .select('*')
      .eq('listing_id', listingId)
      .eq('recycler_id', profile.recycler_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Gate: hanya listing dengan material yang diterima recycler yang boleh
  // dibuka. Recycler yang sudah punya bid di listing ini tetap bisa membukanya
  // (mis. sedang negosiasi), agar tidak mengunci akses alur yang sudah berjalan.
  const acceptedMaterials = (recyclerDetails?.data?.accepted_materials || []) as string[]
  const materialKey = `${row.category ?? ''}:${row.material_type ?? ''}`
  if (!acceptedMaterials.includes(materialKey) && !myBid.data) {
    return { error: 'Listing tidak tersedia untuk fasilitas Anda' }
  }

  let companyInfo: { id: string; name: string; logo_url: string | null } | null = null
  if (row.company_id) {
    const { data: company } = await supabase
      .from('view_company_public')
      .select('id, name, logo_url')
      .eq('id', row.company_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    companyInfo = (company as any) ?? null
  }
  const listing = { ...row, companies: companyInfo }

  return { data: { listing, myBid: myBid.data } }
}

// ============================================
// COMPANY: BROWSE RECYCLERS NEARBY
// ============================================
export async function getRecyclersNearby() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found', data: [] }

  const { data: company } = await supabase
    .from('companies')
    .select('location')
    .eq('id', profile.company_id)
    .maybeSingle()

  const location = (company as { location?: unknown })?.location
  if (!location) return { error: 'Lokasi perusahaan belum diatur. Lengkapi profil perusahaan terlebih dahulu.', data: [] }

  const coords = parsePostGISLocation(location)
  if (!coords) return { error: 'Format lokasi perusahaan tidak valid', data: [] }

  const { lat, lng } = coords

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recyclers, error } = await (supabase.rpc as any)(
    'get_recyclers_within_radius',
    { p_lat: lat, p_lng: lng, p_material_filter: null },
  )

  if (error) return { error: error.message, data: [] }
  return { data: recyclers || [], filterInfo: { lat, lng } }
}

// ============================================
// COMPANY: REQUEST PICKUP KE RECYCLER
// ============================================
export async function createRequestPickup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = createRequestPickupSchema.safeParse({
    listing_id: formData.get('listing_id'),
    recycler_id: formData.get('recycler_id'),
    price: formData.get('price') ? parseFloat(formData.get('price') as string) : null,
    note: formData.get('note') || null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  const { data: listing } = await supabase
    .from('waste_listings')
    .select('id, status')
    .eq('id', parsed.data.listing_id)
    .eq('company_id', profile.company_id)
    .single()

  if (!listing) return { error: 'Listing tidak ditemukan atau bukan milik Anda' }
  if (listing.status !== 'open') return { error: 'Listing sudah tidak tersedia' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase.rpc as any)('company_send_request_pickup', {
    p_listing_id: parsed.data.listing_id,
    p_recycler_id: parsed.data.recycler_id,
    p_price: parsed.data.price,
    p_note: parsed.data.note ?? null,
  })

  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('policy') || msg.includes('permission') || msg.includes('row-level security')) {
      return {
        error: 'Gagal kirim request: kebijakan database (RLS) belum aktif. Jalankan migrasi 20260901000043, lalu coba lagi.',
      }
    }
    return { error: error.message }
  }

  if (!result?.ok) return { error: result?.error || 'Gagal kirim request' }
  return { data: result?.data }
}

// ============================================
// COMPANY: LIHAT REQUEST TERKIRIM
// ============================================
export async function getCompanyRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found', data: [] }

  const { data: listings } = await supabase
    .from('waste_listings')
    .select('id')
    .eq('company_id', profile.company_id)

  if (!listings?.length) return { data: [] }

  const listingIds = listings.map((l) => l.id)

  const { data: requests, error } = await supabase
    .from('marketplace_bids')
    .select(`
      *,
      waste_listings (
        id,
        material_type,
        category,
        weight,
        unit,
        status
      )
    `)
    .in('listing_id', listingIds)
    .eq('initiator', 'company')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }

  // Nama recycler lewat view aman-PII (batch)
  const recyclerIds = [
    ...new Set(
      (requests ?? [])
        .map((r) => r.recycler_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  let recyclersById: Record<string, { id: string; name: string; logo_url: string | null }> = {}
  if (recyclerIds.length > 0) {
    const { data: recyclers } = await supabase
      .from('view_recycler_public')
      .select('id, name, logo_url')
      .in('id', recyclerIds)
    recyclersById = Object.fromEntries(
      (recyclers ?? []).map((r) => [r.id, r]),
    )
  }

  const data = (requests ?? []).map((request) => ({
    ...request,
    recyclers: request.recycler_id
      ? (recyclersById[request.recycler_id] ?? { id: request.recycler_id, name: null, logo_url: null })
      : null,
  }))
  return { data }
}

// ============================================
// RECYCLER: REQUEST MASUK DARI COMPANY
// ============================================
export async function getRecyclerIncomingRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) return { error: 'Recycler profile not found', data: [] }

  const { data: requests, error } = await supabase
    .from('marketplace_bids')
    .select(`
      *,
      waste_listings (
        id,
        material_type,
        category,
        weight,
        unit,
        address_text,
        free_for_pickup,
        status
      )
    `)
    .eq('recycler_id', profile.recycler_id)
    .eq('initiator', 'company')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }

  // Nama company lewat view aman-PII (batch)
  const companyIds = [
    ...new Set(
      (requests ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.waste_listings?.company_id)
        .filter((id: unknown): id is string => Boolean(id)),
    ),
  ]
  let companiesById: Record<string, { id: string; name: string }> = {}
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('view_company_public')
      .select('id, name')
      .in('id', companyIds)
    companiesById = Object.fromEntries(
      (companies ?? []).map((c) => [c.id, c]),
    )
  }

  const data = (requests ?? []).map((request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = request as any
    const listing = req.waste_listings
    return {
      ...request,
      waste_listings: listing
        ? {
            ...listing,
            company_id: listing.company_id,
            companies: listing.company_id
              ? (companiesById[listing.company_id] ?? null)
              : null,
          }
        : null,
    }
  })
  return { data }
}

// ============================================
// RECYCLER: RESPON REQUEST DARI COMPANY
// ============================================
export async function respondToCompanyRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const bidId = formData.get('bid_id') as string
  const action = formData.get('action') as string

  if (!bidId || !['accept', 'reject'].includes(action ?? ''))
    return { error: 'Parameter tidak valid' }

  // Semua validasi & transisi dijalankan di dalam RPC (SECURITY DEFINER):
  // - hanya recycler tujuan yang bisa merespons
  // - accept -> bid accepted, listing 'dealing', bid lain direject,
  //   chat thread dibuat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase.rpc as any)(
    'recycler_respond_company_request',
    {
      p_bid_id: bidId,
      p_action: action,
    },
  )

  if (error) return { error: error.message }
  if (!result?.ok) return { error: result?.error || 'Gagal memproses request' }
  return { success: true }
}

// ============================================
// COMPANY: KONFIRMASI PICKUP (atur jadwal pickup)
// Hanya berlaku saat status listing 'dealing' (-> confirmed)
// atau 'confirmed' (reschedule).
// ============================================
export async function confirmPickupSchedule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = confirmPickupSchema.safeParse({
    listing_id: formData.get('listing_id'),
    scheduled_at: formData.get('scheduled_at'),
    pickup_address: (formData.get('pickup_address') as string) || null,
    pickup_note: (formData.get('pickup_note') as string) || null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  const { data: listing } = await supabase
    .from('waste_listings')
    .select('id, company_id, status')
    .eq('id', parsed.data.listing_id)
    .single()

  if (!listing || listing.company_id !== profile.company_id) {
    return { error: 'Listing tidak ditemukan atau bukan milik Anda' }
  }
  if (listing.status !== 'dealing' && listing.status !== 'confirmed') {
    return { error: 'Konfirmasi pickup hanya bisa dilakukan setelah negosiasi selesai (status Negosiasi)' }
  }

  const { data: acceptedBid } = await supabase
    .from('marketplace_bids')
    .select('id')
    .eq('listing_id', listing.id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!acceptedBid) return { error: 'Belum ada bid yang diterima untuk listing ini' }

  const scheduledAt = new Date(parsed.data.scheduled_at)
  if (isNaN(scheduledAt.getTime())) return { error: 'Tanggal jadwal tidak valid' }
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { error: 'Jadwal pickup harus di masa mendatang' }
  }

  const { error: bidError } = await supabase
    .from('marketplace_bids')
    .update({
      pickup_scheduled_at: scheduledAt.toISOString(),
      pickup_address: parsed.data.pickup_address,
      pickup_note: parsed.data.pickup_note,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', acceptedBid.id)

  if (bidError) return { error: bidError.message }

  if (listing.status === 'dealing') {
    const { error: listingError } = await supabase
      .from('waste_listings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', listing.id)

    if (listingError) return { error: listingError.message }
  }

  // Fase 5: buat manifest digital + QR saat pickup dikonfirmasi (idempotent).
  // Hanya dibuat sekali per bid yang diterima — pada reschedule ulang,
  // RPC mengembalikan manifest yang sudah ada.
  const manifestNo = generateManifestNo()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifestResult = await (supabase.rpc as any)('create_pickup_manifest', {
    p_listing_id: listing.id,
    p_manifest_no: manifestNo,
    p_qr_code: manifestNo,
  })

  if (manifestResult.error) return { error: manifestResult.error.message }
  const manifestData = manifestResult.data as { ok?: boolean; error?: string } | null
  if (!manifestData?.ok) {
    return { error: manifestData?.error ?? 'Gagal membuat manifest pickup' }
  }

  return { success: true, newStatus: 'confirmed' }
}

function generateManifestNo() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `EC-${date}-${rand}`
}

// ============================================
// FULFILLMENT: Data manifest + pickup + sertifikat (untuk kedua role)
// ============================================
export async function getListingFulfillment(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: manifest, error: manifestError } = await db
    .from('manifests')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (manifestError && manifestError.code !== 'PGRST116') {
    return { error: manifestError.message, data: null }
  }

  // Jalankan semua query pendukung secara paralel agar memuat lebih cepat.
  const [
    pickupResult,
    certResult,
    listingResult,
    bidResult,
  ] = await Promise.all([
    manifest
      ? db.from('pickup_records').select('*').eq('manifest_id', manifest.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    manifest
      ? db.from('certificates').select('*').eq('manifest_id', manifest.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from('waste_listings')
      .select('company_id, category, material_type, weight, unit, address_text')
      .eq('id', listingId)
      .maybeSingle(),
    db
      .from('marketplace_bids')
      .select('id, recycler_id, pickup_scheduled_at, pickup_address, pickup_note')
      .eq('listing_id', listingId)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const pickupRecord = pickupResult.data as Record<string, unknown> | null
  const certificate = certResult.data as Record<string, unknown> | null
  const listing = listingResult.data as Record<string, unknown> | null
  const bid = bidResult.data as Record<string, unknown> | null

  const pickupError = pickupResult.error
  if (manifest && pickupError && pickupError.code !== 'PGRST116') {
    return { error: pickupError.message, data: null }
  }
  const certError = certResult.error
  if (manifest && certError && certError.code !== 'PGRST116') {
    return { error: certError.message, data: null }
  }
  const listingError = listingResult.error
  if (listingError && listingError.code !== 'PGRST116') {
    return { error: listingError.message, data: null }
  }
  const bidError = bidResult.error
  if (bidError && bidError.code !== 'PGRST116') {
    return { error: bidError.message, data: null }
  }

  const listing_ = listing as {
    company_id?: string
    category?: string
    material_type?: string
    weight?: number | null
    unit?: string
    address_text?: string
  } | null
  const bid_ = bid as {
    id?: string
    recycler_id?: string
    pickup_scheduled_at?: string | null
    pickup_address?: string | null
    pickup_note?: string | null
  } | null

  // Nama pihak lawan dibaca lewat view aman-PII (verified only),
  // bukan langsung dari base table companies/recyclers.
  let companyName: string | null = null
  let recyclerName: string | null = null
  if (listing_?.company_id) {
    const cRes = await db
      .from('view_company_public')
      .select('name')
      .eq('id', listing_.company_id)
      .maybeSingle()
    if (!cRes.error) companyName = cRes.data?.name ?? null
  }
  if (bid_?.recycler_id) {
    const rRes = await db
      .from('view_recycler_public')
      .select('name')
      .eq('id', bid_.recycler_id)
      .maybeSingle()
    if (!rRes.error) recyclerName = rRes.data?.name ?? null
  }

  // Faktor emisi material dari modul carbon accounting —
  // net = EF virgin − EF daur ulang, dipakai untuk "CO2e terhindar"
  // di sertifikat (konsisten dengan RPC issue_certificate).
  let avoidedEf: {
    virgin_ef_kg_co2e?: number
    recycled_ef_kg_co2e?: number
    avoided_ef_kg_co2e?: number
    ef_source?: string
    ef_year?: number
    ef_unit?: string
  } | null = null
  if (listing_) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const efRes = await (db.rpc as any)('recycling_avoided_ef', {
      p_category: listing_.category ?? '',
      p_material: listing_.material_type ?? '',
      p_unit: listing_.unit ?? 'kg',
    })
    const row = efRes?.data?.[0] as
      | {
          virgin_ef_kg_co2e?: number
          recycled_ef_kg_co2e?: number
          avoided_ef_kg_co2e?: number
          ef_source?: string
          ef_year?: number
          ef_unit?: string
        }
      | null
      | undefined
    if (efRes?.error == null && row) avoidedEf = row
  }

  const pickupNetWeightKg =
    pickupRecord && typeof pickupRecord.net_weight_kg === 'number'
      ? (pickupRecord.net_weight_kg as number)
      : null

  return {
    data: {
      manifest: manifest ?? null,
      pickupRecord: pickupRecord ?? null,
      certificate: certificate ?? null,
      schedule: bid_
        ? {
            bid_id: bid_.id ?? '',
            pickup_scheduled_at: bid_.pickup_scheduled_at ?? null,
            pickup_address: bid_.pickup_address ?? null,
            pickup_note: bid_.pickup_note ?? null,
          }
        : null,
      meta: {
        company_name: companyName ?? '',
        recycler_name: recyclerName ?? '',
        material_type: listing_?.material_type ?? '',
        weight: listing_?.weight ?? null,
        unit: listing_?.unit ?? '',
        address_text: listing_?.address_text ?? '',
        ef_virgin_kg_co2e: avoidedEf?.virgin_ef_kg_co2e ?? null,
        ef_recycled_kg_co2e: avoidedEf?.recycled_ef_kg_co2e ?? null,
        ef_kg_co2e: avoidedEf?.avoided_ef_kg_co2e ?? null,
        ef_source: avoidedEf?.ef_source ?? null,
        ef_year: avoidedEf?.ef_year ?? null,
        ef_unit: avoidedEf?.ef_unit ?? 'kg',
        co2e_avoided_kg:
          avoidedEf?.avoided_ef_kg_co2e != null && pickupNetWeightKg != null
            ? Math.round(
                (pickupNetWeightKg * avoidedEf.avoided_ef_kg_co2e) /
                  (avoidedEf.ef_unit === 'tonne' ? 1000 : 1) * 100,
              ) / 100
            : null,
      },
    },
  }
}

// ============================================
// FULFILLMENT: Data manifest publik (tanpa auth) untuk verifikasi QR
// ============================================
export async function getPublicManifest(manifestNo: string) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_public_manifest', {
    p_manifest_no: manifestNo,
  })

  if (error) return { error: error.message, data: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as { ok?: boolean; error?: string; data?: any }
  if (!result?.ok) return { error: result?.error ?? 'Manifest tidak ditemukan', data: null }

  return { data: result.data ?? null }
}

// ============================================
// FULFILLMENT: Recycler mencatat kehadiran dengan memindai QR
// (dipanggil saat recycler membuka halaman verifikasi di lokasi)
// ============================================
export async function recyclerMarkAttended(manifestNo: string) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('recycler_mark_attended', {
    p_manifest_no: manifestNo,
  })

  if (error) {
    return { attended: false, reason: 'error', message: error.message }
  }

  const result = data as {
    ok?: boolean
    attended?: string | null
    reason?: string
    error?: string
  }
  if (!result?.ok) {
    return {
      attended: false,
      reason: result?.reason ?? 'error',
      message: result?.error ?? 'Gagal mencatat kehadiran',
    }
  }

  return { attended: true, attendedAt: result.attended ?? null }
}

// ============================================
// FULFILLMENT: Recycler mencatat pickup (berat bersih + foto bukti)
// ============================================
export async function recordPickup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = recordPickupSchema.safeParse({
    manifest_id: formData.get('manifest_id'),
    net_weight_kg: parseFloat(formData.get('net_weight_kg') as string),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }

  // Upload foto bukti ke bucket privat pickup-evidence
  // path: {user_id}/{manifest_id}/{file} — policy mengharuskan mulai dari user_id.
  const photoFiles = formData.getAll('photos') as File[]
  const photoPaths: string[] = []

  for (const file of photoFiles) {
    if (file.size === 0) continue
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`
    const path = `${user.id}/${parsed.data.manifest_id}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('pickup-evidence')
      .upload(path, file)

    if (uploadError) {
      return { error: `Upload foto bukti gagal: ${uploadError.message}` }
    }
    photoPaths.push(path)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('record_pickup', {
    p_manifest_id: parsed.data.manifest_id,
    p_net_weight_kg: parsed.data.net_weight_kg,
    p_photos: photoPaths,
  })

  if (error) return { error: error.message }
  const result = data as { ok?: boolean; error?: string }
  if (!result?.ok) return { error: result?.error ?? 'Gagal mencatat pickup' }

  return { success: true }
}

// ============================================
// FULFILLMENT: Company mengonfirmasi data pickup (transaksi selesai)
// ============================================
export async function companyConfirmPickup(formData: FormData) {
  const supabase = await createClient()
  const parsed = confirmFulfillmentSchema.safeParse({
    manifest_id: formData.get('manifest_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('company_confirm_pickup', {
    p_manifest_id: parsed.data.manifest_id,
  })

  if (error) return { error: error.message }
  const result = data as { ok?: boolean; error?: string }
  if (!result?.ok) return { error: result?.error ?? 'Gagal mengonfirmasi transaksi' }

  return { success: true }
}

// ============================================
// FULFILLMENT: Terbitkan sertifikat setelah company konfirmasi
// PDF diupload via admin client (service role) — bucket certificates
// memang untuk service-role write. Berat/co2e/nama diambil RPC dari DB.
// ============================================
export async function issueCertificate(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = issueCertificateSchema.safeParse({
    manifest_id: formData.get('manifest_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }

  const pdfFile = formData.get('pdf') as File | null
  if (!pdfFile || pdfFile.size === 0) {
    return { error: 'File PDF sertifikat tidak ditemukan' }
  }
  if (pdfFile.type !== 'application/pdf') {
    return { error: 'File harus berformat PDF' }
  }
  if (pdfFile.size > 5 * 1024 * 1024) {
    return { error: 'Ukuran PDF maksimal 5 MB' }
  }

  // Otorisasi SEBELUM efek samping upload: pemanggil harus company
  // pemilik listing dari manifest ini (sama dengan cek di RPC
  // issue_certificate — dijaga dua lapis).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'company' || !profile.company_id) {
    return { error: 'Company profile not found' }
  }

  const { data: manifest } = await supabase
    .from('manifests')
    .select('id, status, waste_listings!inner(company_id)')
    .eq('id', parsed.data.manifest_id)
    .maybeSingle()

  if (!manifest) return { error: 'Manifest tidak ditemukan' }
  const listing = manifest.waste_listings as { company_id: string }
  if (listing.company_id !== profile.company_id) {
    return { error: 'Unauthorized: Anda bukan pemilik listing ini' }
  }
  if (
    manifest.status !== 'confirmed' &&
    manifest.status !== 'certificate_issued'
  ) {
    return { error: 'Transaction belum dikonfirmasi' }
  }

  // Bucket 'certificates' di-loading service-role only (lihat migrasi 01),
  // jadi upload di sini lewat admin client agar tidak terikat storage RLS.
  // Nama file dibuat SERVER (bukan dari klien) + tanpa overwrite:
  // mencegah penimpaan PDF milik pihak lain pada path yang bisa ditebak.
  const admin = createAdminClient()
  const fileName = `sertifikat-${crypto.randomUUID()}.pdf`
  const path = `${parsed.data.manifest_id}/${fileName}`
  const { error: uploadError } = await admin.storage
    .from('certificates')
    .upload(path, pdfFile, { upsert: false })

  if (uploadError) return { error: `Upload sertifikat gagal: ${uploadError.message}` }

  const { data: { publicUrl } } = admin.storage
    .from('certificates')
    .getPublicUrl(path)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('issue_certificate', {
    p_manifest_id: parsed.data.manifest_id,
    p_pdf_url: publicUrl,
  })

  if (error) return { error: error.message }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as { ok?: boolean; error?: string; certificate?: any }
  if (!result?.ok) return { error: result?.error ?? 'Gagal menerbitkan sertifikat' }

  return { success: true, certificate: result.certificate ?? null }
}

// ============================================
// PROFIL PUBLIK: LIhat profil company (untuk recycler)
// ============================================
export async function getCompanyProfilePublic(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: null }

  // Baca lewat view aman-PII (verified only), bukan base table.
  const { data, error } = await supabase
    .from('view_company_public')
    .select('*')
    .eq('id', companyId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return { error: error.message, data: null }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: (data as any) ?? null }
}

// ============================================
// PROFIL PUBLIK: Lihat profil recycler (untuk company)
// ============================================
export async function getRecyclerProfilePublic(recyclerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: null }

  // Baca lewat view aman-PII (verified only), bukan base table.
  const { data: row, error: viewError } = await supabase
    .from('view_recycler_public')
    .select('*')
    .eq('id', recyclerId)
    .maybeSingle()

  if (viewError && viewError.code !== 'PGRST116') {
    return { error: viewError.message, data: null }
  }
  if (!row) return { data: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowAny = row as any
  return {
    data: {
      id: rowAny.id,
      name: rowAny.name,
      address: rowAny.address,
      logo_url: rowAny.logo_url,
      capacity_kg_per_month: rowAny.capacity_kg_per_month,
      verification_status: rowAny.verification_status,
      created_at: rowAny.created_at,
      details: {
        accepted_materials: rowAny.accepted_materials,
        capacity_per_month: rowAny.capacity_per_month,
        location: rowAny.location,
        service_radius_km: rowAny.service_radius_km,
        certifications: rowAny.certifications,
        is_active: rowAny.is_active,
      },
    },
  }
}