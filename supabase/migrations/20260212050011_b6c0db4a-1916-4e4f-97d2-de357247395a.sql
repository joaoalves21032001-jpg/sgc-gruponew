
-- Add disabled column to profiles for soft-delete
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;
