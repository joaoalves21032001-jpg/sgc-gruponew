
-- Fix overly permissive update policy on leads
DROP POLICY "Authenticated users can update lead stage" ON public.leads;

-- Allow users to update leads they created, or admins can update any
CREATE POLICY "Users can update own leads" ON public.leads FOR UPDATE
  USING ((auth.uid() = created_by) OR is_admin());
