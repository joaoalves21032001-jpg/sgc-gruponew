-- ================================================
-- Migration: Fix notifications INSERT RLS policy
-- ================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- Create a new policy allowing any authenticated user to insert notifications
-- This is necessary so users can trigger notifications for their leaders or other users
-- based on the notification rules (e.g. 'venda_alteracao' triggering a notification for the leader)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
