-- Add emergency contact NAME columns to profiles and access_requests
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_emergencia_1 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_emergencia_2 text;

ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_1 text;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS nome_emergencia_2 text;
