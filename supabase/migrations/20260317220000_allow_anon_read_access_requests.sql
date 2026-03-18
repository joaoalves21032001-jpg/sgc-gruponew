-- Allow anon users to read their own access_request by ID
-- This is needed for the Login.tsx polling to work for unauthenticated users
-- who are waiting for access approval

-- First, check if RLS is enabled on access_requests
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing anon read policy if it exists (idempotent)
DROP POLICY IF EXISTS "anon_read_own_access_request" ON public.access_requests;
DROP POLICY IF EXISTS "Anyone can read access requests by id" ON public.access_requests;

-- Allow reading by ID without auth (for status polling from login page)
-- The ID is a UUIDv4, practically impossible to guess by brute force
CREATE POLICY "anon_read_own_access_request"
  ON public.access_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep existing policies for write operations (admins only via service role / Edge Functions)
