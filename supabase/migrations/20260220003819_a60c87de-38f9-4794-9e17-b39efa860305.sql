
-- Update handle_new_user trigger to create profiles as disabled by default
-- Only admin-approved users will be enabled
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, apelido, disabled)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    true
  );
  -- Default role: consultor
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'consultor');
  RETURN NEW;
END;
$function$;
