-- ===========================================================================
-- MIGRATION: Fix Audit Logs Visibility + Add has_permission helper
-- ===========================================================================

-- 1. Create a helper function to verify if a user has a specific permission
-- This is useful for RLS where we cannot easily hit the frontend logic.
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid;
    v_allowed boolean;
BEGIN
    -- Get the user's security profile id
    SELECT security_profile_id INTO v_profile_id
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_profile_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check if there's a specific allowance for this resource and action
    SELECT allowed INTO v_allowed
    FROM public.security_profile_permissions
    WHERE profile_id = v_profile_id
      AND resource = p_resource
      AND action = p_action
    LIMIT 1;

    RETURN COALESCE(v_allowed, false);
END;
$$;

-- 2. Drop the old restrictive audit_logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.audit_logs;

-- 3. Create new RLS policies bounded to the Matrix Role-Based Access Control
-- We check for the 'logs_auditoria' resource.

-- VIEW
CREATE POLICY "Users with View permission can see logs"
ON public.audit_logs FOR SELECT
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'view'));

-- INSERT (Manual logs creation from the new CRUD, plus system logs)
-- Everyone should still be able to insert their own logs triggered by the system.
-- But the new configuration tab allows manual creation if they have 'edit'/'create' permissions,
-- Since the frontend handles "Action" strings freely, we allow insert if it's their own log
-- OR if they have 'edit' permission in 'logs_auditoria'.
CREATE POLICY "Users can insert logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR public.has_permission(auth.uid(), 'logs_auditoria', 'edit')
);

-- UPDATE (From the new CRUD)
CREATE POLICY "Users with Edit permission can modify logs"
ON public.audit_logs FOR UPDATE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));

-- DELETE (From the new CRUD)
CREATE POLICY "Users with Edit permission can delete logs"
ON public.audit_logs FOR DELETE
USING (public.has_permission(auth.uid(), 'logs_auditoria', 'edit'));
