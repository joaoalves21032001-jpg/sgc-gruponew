-- Drop the restrictive tipo check and allow modalidade names
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_tipo_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_tipo_check CHECK (tipo = ANY (ARRAY['pessoa_fisica'::text, 'empresa'::text, 'PF'::text, 'Familiar'::text, 'PME Multi'::text, 'Empresarial'::text, 'Adesão'::text]));