-- ================================================
-- Notification Rules (editable notification routing)
-- Run in Supabase SQL Editor
-- ================================================

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,         -- e.g. 'atividade_registrada', 'aniversariante_mes'
  event_label TEXT NOT NULL,       -- e.g. 'Atividade Registrada'
  audience TEXT NOT NULL,          -- 'lideranca_direta', 'todos', 'gestores', 'admins', 'proprio'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_key, audience)
);

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_rules_select" ON notification_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "notif_rules_insert" ON notification_rules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notif_rules_update" ON notification_rules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "notif_rules_delete" ON notification_rules FOR DELETE USING (auth.role() = 'authenticated');

-- Seed default rules
INSERT INTO notification_rules (event_key, event_label, audience, enabled) VALUES
  -- Atividade registrada → liderança direta
  ('atividade_registrada', 'Atividade Registrada', 'lideranca_direta', true),
  -- Alteração de atividade solicitada → liderança direta  
  ('atividade_alteracao', 'Solicitação de Alteração de Atividade', 'lideranca_direta', true),
  -- Nova venda criada → liderança direta
  ('venda_criada', 'Nova Venda Criada', 'lideranca_direta', true),
  -- Venda aprovada → próprio usuário
  ('venda_aprovada', 'Venda Aprovada', 'proprio', true),
  -- Venda devolvida → próprio usuário
  ('venda_devolvida', 'Venda Devolvida', 'proprio', true),
  -- Cotação aprovada/reprovada → próprio
  ('cotacao_aprovada', 'Cotação Aprovada', 'proprio', true),
  ('cotacao_reprovada', 'Cotação Reprovada', 'proprio', true),
  -- Solicitação de acesso → gestores
  ('acesso_solicitado', 'Solicitação de Acesso', 'gestores', true),
  -- Acesso aprovado → próprio
  ('acesso_aprovado', 'Acesso Aprovado', 'proprio', true),
  -- Acesso rejeitado → próprio
  ('acesso_rejeitado', 'Acesso Rejeitado', 'proprio', true),
  -- Aniversariante do mês → todos
  ('aniversariante_mes', 'Aniversariante do Mês', 'todos', true),
  -- Lead movido de etapa → liderança direta
  ('lead_movido', 'Lead Movido de Etapa', 'lideranca_direta', true),
  -- Meta batida → gestores
  ('meta_batida', 'Meta Batida', 'gestores', true),
  -- Premiação adicionada → próprio
  ('premiacao_adicionada', 'Premiação Adicionada', 'proprio', true)
ON CONFLICT (event_key, audience) DO NOTHING;
