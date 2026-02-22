
-- Add supervisor_id and gerente_id to access_requests for tracking hierarchy
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS supervisor_id uuid;
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS gerente_id uuid;
