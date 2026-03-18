-- Add 'consumido' status to mfa_reset_requests so the client can mark
-- an approved request as consumed after auto-unenrolling factors.
ALTER TABLE public.mfa_reset_requests DROP CONSTRAINT IF EXISTS mfa_reset_requests_status_check;
ALTER TABLE public.mfa_reset_requests ADD CONSTRAINT mfa_reset_requests_status_check
  CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'consumido'));
