-- Fix leads RLS: allow users with view_all or edit_leads CRM permission to see all leads
-- Others (view_own) see only their own leads + free leads

-- Drop existing policies
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "leads_select" ON leads;

-- Make sure RLS is enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- SELECT policy: view_all/edit_leads = all leads; otherwise own + free leads
CREATE POLICY "leads_select_by_permission" ON leads
  FOR SELECT
  USING (
    -- Superadmin or users with view_all/edit_leads see everything
    public.has_permission(auth.uid(), 'crm', 'view_all')
    OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
    -- Others see their own or free leads
    OR auth.uid() = created_by
    OR livre = true
  );

-- INSERT: users who can create
CREATE POLICY "leads_insert_policy" ON leads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.has_permission(auth.uid(), 'crm', 'create')
      OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
    )
  );

-- UPDATE: owner or admin
CREATE POLICY "leads_update_policy" ON leads
  FOR UPDATE
  USING (
    public.has_permission(auth.uid(), 'crm', 'edit_leads')
    OR (auth.uid() = created_by AND public.has_permission(auth.uid(), 'crm', 'edit'))
  );

-- DELETE: admin only
CREATE POLICY "leads_delete_policy" ON leads
  FOR DELETE
  USING (
    public.has_permission(auth.uid(), 'crm', 'edit_leads')
    OR (auth.uid() = created_by AND public.has_permission(auth.uid(), 'crm', 'edit'))
  );
