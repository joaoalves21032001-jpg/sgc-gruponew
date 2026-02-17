
-- Kanban stages for the CRM board
CREATE TABLE public.lead_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#3b82f6',
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lead_stages" ON public.lead_stages FOR SELECT USING (true);
CREATE POLICY "Admins can manage lead_stages" ON public.lead_stages FOR ALL USING (is_admin());

-- Add stage_id to leads
ALTER TABLE public.leads ADD COLUMN stage_id uuid REFERENCES public.lead_stages(id) ON DELETE SET NULL;

-- Insert default stages
INSERT INTO public.lead_stages (nome, cor, ordem) VALUES
  ('Novo Contato', '#3b82f6', 0),
  ('Em Andamento', '#f59e0b', 1),
  ('Proposta Enviada', '#8b5cf6', 2),
  ('Fechado', '#22c55e', 3);

-- Update leads RLS: allow authenticated users to update stage_id (drag)
CREATE POLICY "Authenticated users can update lead stage" ON public.leads FOR UPDATE USING (true) WITH CHECK (true);
