
-- Add logo_url to companhias for branding
ALTER TABLE public.companhias ADD COLUMN IF NOT EXISTS logo_url text;

-- Enable lead 'livre' toggle - column already exists from types
-- Just make sure it defaults properly (already done)

-- Add correction_requests tab support - table already exists
-- Let's ensure access_requests handles reuse of email from disabled users

-- Create a function to handle duplicate email check for access requests
CREATE OR REPLACE FUNCTION public.check_reusable_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = _email AND disabled = false
  )
$$;
