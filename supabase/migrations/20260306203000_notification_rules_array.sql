-- ================================================
-- Migration: Add multiple audiences to notification rules
-- ================================================

-- 1. Create the new audiences column (array of text)
ALTER TABLE notification_rules ADD COLUMN audiences TEXT[] DEFAULT '{}';

-- 2. Migrate existing data from the scalar 'audience' column into the new array column
UPDATE notification_rules SET audiences = ARRAY[audience];

-- 3. Drop the old unique constraint which depended on the scalar 'audience'
ALTER TABLE notification_rules DROP CONSTRAINT notification_rules_event_key_audience_key;

-- 4. Add a new unique constraint just on 'event_key' (each event should have only one rule record now)
ALTER TABLE notification_rules ADD CONSTRAINT notification_rules_event_key_key UNIQUE (event_key);

-- 5. Drop the old scalar 'audience' column
ALTER TABLE notification_rules DROP COLUMN audience;
