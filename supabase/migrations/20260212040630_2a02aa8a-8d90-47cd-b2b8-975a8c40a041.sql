
-- Table for access requests from unregistered users
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can request access"
ON public.access_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view/manage
CREATE POLICY "Admins can manage access requests"
ON public.access_requests
FOR ALL
USING (public.is_admin());
