
-- 1. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);

-- Only admins can view logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (is_admin());

-- Any authenticated user can insert their own logs
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all logs
CREATE POLICY "Admins can manage audit logs"
ON public.audit_logs FOR ALL
USING (is_admin());

-- Cleanup function for logs older than 1 year
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < now() - interval '1 year';
END;
$$;

-- 2. ADD created_by TO LEADS
ALTER TABLE public.leads ADD COLUMN created_by uuid;

-- Allow authenticated users to insert leads
CREATE POLICY "Authenticated users can insert leads"
ON public.leads FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow users to view leads they created (already have "Anyone can view leads")
-- No extra policy needed for SELECT

-- 3. ADD lead_change_requests support via correction_requests
-- We'll reuse correction_requests with tipo = 'lead_edit' or 'lead_delete'
-- Add supervisor approval policies
CREATE POLICY "Supervisors can view correction requests of their team"
ON public.correction_requests FOR SELECT
USING (
  is_supervisor() AND is_consultor_under_me(user_id)
  OR is_gerente()
  OR is_admin()
);

CREATE POLICY "Supervisors can update correction requests of their team"
ON public.correction_requests FOR UPDATE
USING (
  (is_supervisor() AND is_consultor_under_me(user_id))
  OR is_gerente()
  OR is_admin()
);
