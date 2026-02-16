-- Create storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documentos', 'lead-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lead documents
CREATE POLICY "Admins can upload lead documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-documentos' AND public.is_admin());

CREATE POLICY "Admins can view lead documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lead-documentos' AND public.is_admin());

CREATE POLICY "Admins can delete lead documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lead-documentos' AND public.is_admin());