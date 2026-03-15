ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS vinculo_emergencia_1 TEXT;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS vinculo_emergencia_2 TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vinculo_emergencia_1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vinculo_emergencia_2 TEXT;
