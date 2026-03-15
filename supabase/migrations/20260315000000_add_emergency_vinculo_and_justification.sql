-- Add emergency contact relationship fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vinculo_emergencia_1 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vinculo_emergencia_2 text;

-- Add emergency contact fields to access_requests
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS vinculo_emergencia_1 text;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS vinculo_emergencia_2 text;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_1 text;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_2 text;

-- Add CRM activity justification for low response rate
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS justificativa_baixa_resposta text;
