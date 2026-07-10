
CREATE POLICY "Users upload own captures" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own captures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'captures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Agency reads transfer captures" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'captures'
    AND public.has_role(auth.uid(), 'agency')
    AND EXISTS (
      SELECT 1 FROM public.transfers t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.agency_id = p.agency_id
        AND t.capture_url LIKE '%' || storage.objects.name || '%'
    )
  );

CREATE POLICY "Admin reads all captures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'captures' AND public.has_role(auth.uid(), 'admin'));
