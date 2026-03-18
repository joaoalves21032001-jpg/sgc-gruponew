-- Add is_protected to security_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_profiles' AND column_name = 'is_protected') THEN
        ALTER TABLE security_profiles ADD COLUMN is_protected BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add is_protected to cargos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cargos' AND column_name = 'is_protected') THEN
        ALTER TABLE cargos ADD COLUMN is_protected BOOLEAN DEFAULT false;
    END IF;
END $$;
