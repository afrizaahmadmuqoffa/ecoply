-- Phase 4: Marketplace Tables (Waste Listings, Recycler Profiles, Bids, Chat)

-- 1. Waste Listings
CREATE TABLE IF NOT EXISTS public.waste_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,
    category TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    unit TEXT DEFAULT 'kg',
    location GEOGRAPHY(Point) NOT NULL,
    address_text TEXT,
    condition TEXT,
    photos TEXT[] DEFAULT '{}',
    pickup_schedule TEXT,
    free_for_pickup BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'dealing', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Recycler Profiles (Expanded from basic profile)
CREATE TABLE IF NOT EXISTS public.recycler_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recycler_id UUID NOT NULL REFERENCES public.recyclers(id) ON DELETE CASCADE,
    accepted_materials TEXT[] DEFAULT '{}',
    capacity_per_month NUMERIC,
    location GEOGRAPHY(Point),
    service_radius_km NUMERIC DEFAULT 50,
    certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recycler_id)
);

-- 3. Bids System (Two-way)
CREATE TABLE IF NOT EXISTS public.marketplace_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.waste_listings(id) ON DELETE CASCADE,
    recycler_id UUID NOT NULL REFERENCES public.recyclers(id) ON DELETE CASCADE,
    price NUMERIC, -- NULL if free_for_pickup
    initiator TEXT NOT NULL CHECK (initiator IN ('company', 'recycler')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Chat System
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.waste_listings(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    recycler_id UUID NOT NULL REFERENCES public.recyclers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, company_id, recycler_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- auth.uid()
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- RLS POLICIES

-- Waste Listings
ALTER TABLE public.waste_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open listings" ON public.waste_listings FOR SELECT USING (status = 'open');
CREATE POLICY "Companies can manage their own listings" ON public.waste_listings FOR ALL USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Recycler Details
ALTER TABLE public.recycler_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active recycler details" ON public.recycler_details FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Recyclers can manage their own details" ON public.recycler_details FOR ALL USING (recycler_id IN (SELECT id FROM public.recyclers WHERE user_id = auth.uid()));

-- Bids
ALTER TABLE public.marketplace_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties involved can view bids" ON public.marketplace_bids FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.waste_listings wl JOIN public.companies c ON wl.company_id = c.id WHERE wl.id = listing_id AND c.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = recycler_id AND r.user_id = auth.uid())
);
CREATE POLICY "Recyclers can bid" ON public.marketplace_bids FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = recycler_id AND r.user_id = auth.uid())
);

-- Chat
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view threads" ON public.chat_threads FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = recycler_id AND r.user_id = auth.uid())
);

CREATE POLICY "Thread participants can view messages" ON public.chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (
        EXISTS (SELECT 1 FROM public.companies c WHERE c.id = t.company_id AND c.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = t.recycler_id AND r.user_id = auth.uid())
    ))
);

CREATE POLICY "Thread participants can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (
        EXISTS (SELECT 1 FROM public.companies c WHERE c.id = t.company_id AND c.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = t.recycler_id AND r.user_id = auth.uid())
    )) AND auth.uid() = sender_id
);
