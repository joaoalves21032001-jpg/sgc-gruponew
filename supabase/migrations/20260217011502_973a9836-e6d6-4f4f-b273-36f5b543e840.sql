-- Add notification_auto_delete_days config to a system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage config" ON public.system_config FOR ALL USING (is_admin());

-- Default: auto-delete read notifications after 30 days
INSERT INTO public.system_config (key, value) VALUES ('notification_auto_delete_days', '30')
ON CONFLICT (key) DO NOTHING;

-- Create function to auto-delete old read notifications
CREATE OR REPLACE FUNCTION public.cleanup_read_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days INT;
BEGIN
  SELECT COALESCE(value::int, 0) INTO _days FROM public.system_config WHERE key = 'notification_auto_delete_days';
  IF _days > 0 THEN
    DELETE FROM public.notifications WHERE lida = true AND created_at < now() - (_days || ' days')::interval;
  END IF;
END;
$$;