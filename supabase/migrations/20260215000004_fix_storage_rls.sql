-- ================================================
-- Fix: Lead Document Storage & Leads Table RLS
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================

-- 1. Fix storage bucket: ensure lead-documentos is accessible to all authenticated users
-- First drop any restrictive policies on the storage.objects table for this bucket

-- Drop existing policies for lead-documentos bucket (if they exist)
DO $$
BEGIN
  -- Try to drop each policy, ignore errors if they don't exist
  BEGIN DROP POLICY IF EXISTS "lead_docs_select" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "lead_docs_insert" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "lead_docs_update" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "lead_docs_delete" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Also try common auto-generated policy names
  BEGIN DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_0" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_1" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Give users access to own folder 1ffg0oo_2" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "authenticated can upload lead-documentos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "authenticated can read lead-documentos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "authenticated can update lead-documentos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "authenticated can delete lead-documentos" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 2. Create open policies for lead-documentos bucket (all authenticated users)
CREATE POLICY "lead_docs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "lead_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "lead_docs_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'lead-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "lead_docs_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'lead-documentos' AND auth.role() = 'authenticated');

-- 3. Also fix venda-documentos bucket (same issue could happen)
DO $$
BEGIN
  BEGIN DROP POLICY IF EXISTS "venda_docs_select" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "venda_docs_insert" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "venda_docs_update" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "venda_docs_delete" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

CREATE POLICY "venda_docs_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'venda-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "venda_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'venda-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "venda_docs_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'venda-documentos' AND auth.role() = 'authenticated');

CREATE POLICY "venda_docs_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'venda-documentos' AND auth.role() = 'authenticated');

-- 4. Fix leads table RLS - ensure all authenticated users can CRUD leads
-- First check and drop any restrictive policies
DO $$
BEGIN
  BEGIN DROP POLICY IF EXISTS "Enable read access for all users" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable update for users based on user_id" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "leads_select" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "leads_insert" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "leads_update" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "leads_delete" ON leads; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Enable RLS if not already
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Open policies for leads (app-level RBAC handles permissions)
CREATE POLICY "leads_select" ON leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (auth.role() = 'authenticated');
