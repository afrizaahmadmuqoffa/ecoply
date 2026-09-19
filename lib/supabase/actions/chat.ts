'use server'

import { createClient } from '@/lib/supabase/server'
import { sendMessageSchema } from '@/lib/validators/chat'

// ============================================
// GET CHAT THREADS (untuk chat list page)
// ============================================
export async function getChatThreads() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found', data: [] }

  let query = supabase
    .from('chat_threads')
    .select(`
      *,
      waste_listings (
        id,
        material_type,
        category,
        photos
      )
    `)
    .order('created_at', { ascending: false })

  // Filter berdasarkan role
  if (profile.company_id) {
    query = query.eq('company_id', profile.company_id)
  } else if (profile.recycler_id) {
    query = query.eq('recycler_id', profile.recycler_id)
  } else {
    return { error: 'No company or recycler profile', data: [] }
  }

  const { data: threads, error } = await query

  if (error) return { error: error.message, data: [] }

  const rows = threads || []

  // ── Last message semua thread dalam SATU query (hilangkan N+1) ──
  const threadIds = rows.map((t) => t.id)
  const lastByThread: Record<string, { content: string; created_at: string | null; sender_id: string } | null> = {}
  if (threadIds.length > 0) {
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('thread_id, content, created_at, sender_id')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })
    const seen = new Set<string>()
    for (const m of msgs || []) {
      if (!seen.has(m.thread_id)) {
        seen.add(m.thread_id)
        lastByThread[m.thread_id] = {
          content: m.content,
          created_at: m.created_at,
          sender_id: m.sender_id,
        }
      }
    }
  }

  // ── Nama pihak lawan lewat view aman-PII (batch) ──
  const companyIds = [...new Set(rows.map((t) => t.company_id).filter(Boolean))]
  const recyclerIds = [...new Set(rows.map((t) => t.recycler_id).filter(Boolean))]
  let companiesById: Record<string, { id: string; name: string }> = {}
  let recyclersById: Record<string, { id: string; name: string }> = {}

  const [companyRes, recyclerRes] = await Promise.all([
    companyIds.length > 0
      ? supabase.from('view_company_public').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [], error: null }),
    recyclerIds.length > 0
      ? supabase.from('view_recycler_public').select('id, name').in('id', recyclerIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  companiesById = Object.fromEntries(
    (companyRes.data ?? []).map((c) => [c.id, c]),
  )
  recyclersById = Object.fromEntries(
    (recyclerRes.data ?? []).map((r) => [r.id, r]),
  )

  const result = rows.map((thread) => ({
    ...thread,
    companies: thread.company_id
      ? (companiesById[thread.company_id] ?? null)
      : null,
    recyclers: thread.recycler_id
      ? (recyclersById[thread.recycler_id] ?? null)
      : null,
    last_message: lastByThread[thread.id] ?? null,
  }))

  return { data: result }
}

// ============================================
// GET OR CREATE CHAT THREAD
// ============================================
export async function getOrCreateChatThread(listingId: string, recyclerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Company profile not found' }

  // Coba cari thread yang sudah ada
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('listing_id', listingId)
    .eq('company_id', profile.company_id)
    .eq('recycler_id', recyclerId)
    .maybeSingle()

  if (existing) return { data: existing }

  // Buat thread baru
  const { data: newThread, error } = await supabase
    .from('chat_threads')
    .insert({
      listing_id: listingId,
      company_id: profile.company_id,
      recycler_id: recyclerId,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: newThread }
}

// ============================================
// GET CHAT MESSAGES
// ============================================
export async function getChatMessages(threadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', data: [] }

  // Verify user adalah participant thread
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('company_id, recycler_id')
    .eq('id', threadId)
    .single()

  if (!thread) return { error: 'Thread not found', data: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, recycler_id')
    .eq('id', user.id)
    .single()

  const isParticipant =
    (profile?.company_id && thread.company_id === profile.company_id) ||
    (profile?.recycler_id && thread.recycler_id === profile.recycler_id)

  if (!isParticipant) return { error: 'Unauthorized', data: [] }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { data: messages || [] }
}

// ============================================
// SEND MESSAGE
// ============================================
export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = sendMessageSchema.safeParse({
    thread_id: formData.get('thread_id'),
    content: formData.get('content'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify participant
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('company_id, recycler_id')
    .eq('id', parsed.data.thread_id)
    .single()

  if (!thread) return { error: 'Thread not found' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, recycler_id')
    .eq('id', user.id)
    .single()

  const isParticipant =
    (profile?.company_id && thread.company_id === profile.company_id) ||
    (profile?.recycler_id && thread.recycler_id === profile.recycler_id)

  if (!isParticipant) return { error: 'Unauthorized to send message' }

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: parsed.data.thread_id,
      sender_id: user.id,
      content: parsed.data.content,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: message }
}

// ============================================
// HELPER: isi nama mitra via view aman-PII (verified only)
// ============================================
type ThreadBase = {
  company_id: string | null
  recycler_id: string | null
  [key: string]: unknown
}

async function enrichThreadPartners<T extends ThreadBase>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  thread: T,
): Promise<T & { companies: { id: string; name: string } | null; recyclers: { id: string; name: string } | null }> {
  if (!thread) return thread
  const [companyRes, recyclerRes] = await Promise.all([
    thread.company_id
      ? supabase.from('view_company_public').select('id, name').eq('id', thread.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    thread.recycler_id
      ? supabase.from('view_recycler_public').select('id, name').eq('id', thread.recycler_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  return {
    ...thread,
    companies: companyRes.data ?? null,
    recyclers: recyclerRes.data ?? null,
  }
}

// ============================================
// GET THREAD DETAIL (untuk chat detail page)
// ============================================
export async function getChatThreadDetail(threadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, recycler_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const { data: threadRow, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      waste_listings (
        id,
        material_type,
        category,
        weight,
        unit,
        photos
      )
    `)
    .eq('id', threadId)
    .single()

  if (error || !threadRow) return { error: 'Thread not found' }

  // Verify participant
  const isParticipant =
    (profile.company_id && threadRow.company_id === profile.company_id) ||
    (profile.recycler_id && threadRow.recycler_id === profile.recycler_id)

  if (!isParticipant) return { error: 'Unauthorized' }

  const thread = await enrichThreadPartners(supabase, threadRow)
  return { data: thread }
}

// ============================================
// RECYCLER: GET OR CREATE CHAT THREAD
// ============================================
export async function getOrCreateChatThreadAsRecycler(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('recycler_id, company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.recycler_id) return { error: 'Recycler profile not found' }

  // Ambil company_id dari listing
  const { data: listing } = await supabase
    .from('waste_listings')
    .select('company_id')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing tidak ditemukan' }

  // Cek apakah sudah ada thread
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('listing_id', listingId)
    .eq('company_id', listing.company_id)
    .eq('recycler_id', profile.recycler_id)
    .maybeSingle()

  if (existing) return { data: existing }

  // Buat thread baru
  const { data: newThread, error } = await supabase
    .from('chat_threads')
    .insert({
      listing_id: listingId,
      company_id: listing.company_id,
      recycler_id: profile.recycler_id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: newThread }
}

// ============================================
// GET CHAT THREAD BY LISTING ID (untuk nested route)
// ============================================
export async function getChatThreadByListingId(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, recycler_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const threadSelect = `
    *,
    waste_listings (
      id,
      material_type,
      category,
      weight,
      unit
    )
  `

  let query = supabase
    .from('chat_threads')
    .select(threadSelect)
    .eq('listing_id', listingId)

  // Filter berdasarkan role user
  if (profile.company_id) {
    query = query.eq('company_id', profile.company_id)
  } else if (profile.recycler_id) {
    query = query.eq('recycler_id', profile.recycler_id)
  } else {
    return { error: 'No valid profile' }
  }

  const { data: thread, error } = await query.maybeSingle()

  if (error) return { error: error.message }

  // Auto-create thread bila belum ada (get-or-create), hanya jika ada bid accepted
  if (!thread) {
    // --- Sisi recycler: wajib punya bid accepted pada listing ini ---
    if (profile.recycler_id) {
      const { data: acceptedBid } = await supabase
        .from('marketplace_bids')
        .select('recycler_id')
        .eq('listing_id', listingId)
        .eq('recycler_id', profile.recycler_id)
        .eq('status', 'accepted')
        .maybeSingle()

      if (acceptedBid) {
        const { data: listing } = await supabase
          .from('waste_listings')
          .select('company_id')
          .eq('id', listingId)
          .single()

        if (listing?.company_id) {
          const { data: newThread } = await supabase
            .from('chat_threads')
            .insert({
              listing_id: listingId,
              company_id: listing.company_id,
              recycler_id: profile.recycler_id,
            })
            .select('id')
            .single()

          if (newThread) {
            const { data: fullThreadRow } = await supabase
              .from('chat_threads')
              .select(threadSelect)
              .eq('id', newThread.id)
              .single()

            if (fullThreadRow) {
              const fullThread = await enrichThreadPartners(supabase, fullThreadRow)
              return { data: fullThread }
            }
          }
        }
      }
      return { data: null }
    }

    // --- Sisi company: listing miliknya + ada bid accepted dari recycler ---
    if (profile.company_id) {
      const { data: acceptedBid } = await supabase
        .from('marketplace_bids')
        .select('recycler_id')
        .eq('listing_id', listingId)
        .eq('status', 'accepted')
        .maybeSingle()

      if (acceptedBid?.recycler_id) {
        const { data: newThread } = await supabase
          .from('chat_threads')
          .insert({
            listing_id: listingId,
            company_id: profile.company_id,
            recycler_id: acceptedBid.recycler_id,
          })
          .select('id')
          .single()

        if (newThread) {
          const { data: fullThreadRow } = await supabase
            .from('chat_threads')
            .select(threadSelect)
            .eq('id', newThread.id)
            .single()

          if (fullThreadRow) {
            const fullThread = await enrichThreadPartners(supabase, fullThreadRow)
            return { data: fullThread }
          }
        }
      }
    }

    return { data: null }
  }

  const enriched = await enrichThreadPartners(supabase, thread)
  return { data: enriched }
}