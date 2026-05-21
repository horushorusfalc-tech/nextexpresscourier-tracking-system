-- ============================================
-- Storage policies for bucket: shipment-images
-- Run this in Supabase SQL Editor after creating the bucket "shipment-images" (public).
-- ============================================

-- 1. Anyone (anon + authenticated) can read images — so the Track page can show them.
CREATE POLICY "shipment_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-images');

-- 2. Only authenticated users (admins) can upload, update, or delete.
CREATE POLICY "shipment_images_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shipment-images');

CREATE POLICY "shipment_images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shipment-images')
WITH CHECK (bucket_id = 'shipment-images');

CREATE POLICY "shipment_images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shipment-images');