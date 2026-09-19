-- Izinkan authenticated users melihat data publik companies & recyclers
-- (diperlukan untuk join di chat, bid, dan listing detail)

CREATE POLICY "Authenticated users can view company public info"
ON public.companies
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view recycler public info"
ON public.recyclers
FOR SELECT
USING (auth.uid() IS NOT NULL);