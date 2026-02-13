
-- Fix notifications INSERT policy - restrict to authenticated users inserting for themselves or admin/system
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  is_admin() OR auth.uid() = user_id
);

-- The access_requests INSERT true is intentional (public registration form)
-- No change needed there
