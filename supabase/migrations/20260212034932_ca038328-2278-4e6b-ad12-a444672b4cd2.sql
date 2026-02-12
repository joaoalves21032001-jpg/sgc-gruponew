
-- Table to track MFA trusted devices (31-day trust)
CREATE TABLE public.mfa_trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  trusted_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own trusted devices"
  ON public.mfa_trusted_devices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_mfa_trusted_devices_user ON public.mfa_trusted_devices(user_id);

-- Add avatar storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Admins can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND public.is_admin());

CREATE POLICY "Admins can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND public.is_admin());

CREATE POLICY "Admins can delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND public.is_admin());
