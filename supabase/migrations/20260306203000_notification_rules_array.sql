-- ================================================
-- Migration: Add multiple audiences to notification rules (idempotent)
-- ================================================

DO $$
BEGIN
  -- 1. Add audiences column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_rules' AND column_name = 'audiences'
  ) THEN
    EXECUTE 'ALTER TABLE notification_rules ADD COLUMN audiences TEXT[] DEFAULT ''{}''';
  END IF;

  -- 2. Migrate data from audience to audiences if audience column still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_rules' AND column_name = 'audience'
  ) THEN
    EXECUTE 'UPDATE notification_rules SET audiences = ARRAY[audience] WHERE audiences = ''{}''';
  END IF;

  -- 3. Drop old unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_rules' AND constraint_name = 'notification_rules_event_key_audience_key'
  ) THEN
    EXECUTE 'ALTER TABLE notification_rules DROP CONSTRAINT notification_rules_event_key_audience_key';
  END IF;

  -- 4. Add new unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_rules' AND constraint_name = 'notification_rules_event_key_key'
  ) THEN
    EXECUTE 'ALTER TABLE notification_rules ADD CONSTRAINT notification_rules_event_key_key UNIQUE (event_key)';
  END IF;

  -- 5. Drop old audience column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_rules' AND column_name = 'audience'
  ) THEN
    EXECUTE 'ALTER TABLE notification_rules DROP COLUMN audience';
  END IF;
END $$;
