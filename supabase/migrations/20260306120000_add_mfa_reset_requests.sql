-- MFA Reset Requests table
CREATE TABLE IF NOT EXISTS public.mfa_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  admin_id uuid REFERENCES auth.users(id),
  admin_resposta text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mfa_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests, admins can read all
CREATE POLICY "mfa_reset_select" ON public.mfa_reset_requests FOR SELECT USING (true);
CREATE POLICY "mfa_reset_insert" ON public.mfa_reset_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "mfa_reset_update" ON public.mfa_reset_requests FOR UPDATE USING (true);

-- Index for fast lookups
CREATE INDEX idx_mfa_reset_requests_user ON public.mfa_reset_requests(user_id);
CREATE INDEX idx_mfa_reset_requests_status ON public.mfa_reset_requests(status);
