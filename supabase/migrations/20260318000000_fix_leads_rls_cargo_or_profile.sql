-- Fix leads RLS: recriar policies usando has_permission() atualizada (que já inclui cargo_permissions)
-- Isso resolve o erro "new row violates row-level security policy for table 'leads'"
-- para usuários com permissão somente via Cargo (sem Security Profile direto)

-- Drop todas as policies existentes de leads
DROP POLICY IF EXISTS "leads_select_by_permission" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "leads_update_policy" ON leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON leads;
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "leads_select" ON leads;

-- Garantir RLS habilitado
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ───────────────────────────────────────────────────────────────────
-- has_permission() já verifica security_profile E cargo_permissions (OR interno)
CREATE POLICY "leads_select_by_permission" ON leads
  FOR SELECT
  USING (
    -- Admin total: vê tudo
    public.has_permission(auth.uid(), 'crm.leads', 'view_all')
    OR public.has_permission(auth.uid(), 'crm.leads', 'edit_leads')
    OR public.has_permission(auth.uid(), 'crm', 'view_all')
    OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
    -- Próprio lead ou livre
    OR auth.uid() = created_by
    OR livre = true
  );

-- ─── INSERT ───────────────────────────────────────────────────────────────────
-- Usuário autenticado com permissão de criar (via security profile OU cargo)
CREATE POLICY "leads_insert_policy" ON leads
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.has_permission(auth.uid(), 'crm.leads', 'create')
      OR public.has_permission(auth.uid(), 'crm.leads', 'edit_leads')
      OR public.has_permission(auth.uid(), 'crm', 'create')
      OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
      -- Super admins via cargo nome
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(p.cargo) ILIKE '%administrador%'
      )
    )
  );

-- ─── UPDATE ───────────────────────────────────────────────────────────────────
CREATE POLICY "leads_update_policy" ON leads
  FOR UPDATE
  USING (
    public.has_permission(auth.uid(), 'crm.leads', 'edit_leads')
    OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
    OR (
      auth.uid() = created_by
      AND (
        public.has_permission(auth.uid(), 'crm.leads', 'edit')
        OR public.has_permission(auth.uid(), 'crm', 'edit')
      )
    )
  );

-- ─── DELETE ───────────────────────────────────────────────────────────────────
CREATE POLICY "leads_delete_policy" ON leads
  FOR DELETE
  USING (
    public.has_permission(auth.uid(), 'crm.leads', 'edit_leads')
    OR public.has_permission(auth.uid(), 'crm', 'edit_leads')
    OR (
      auth.uid() = created_by
      AND (
        public.has_permission(auth.uid(), 'crm.leads', 'edit')
        OR public.has_permission(auth.uid(), 'crm', 'edit')
      )
    )
  );
