-- Add meta_titulo to companhias table
-- This determines how many approved sales a user needs to earn the company title
ALTER TABLE companhias ADD COLUMN IF NOT EXISTS meta_titulo INTEGER DEFAULT 10;
