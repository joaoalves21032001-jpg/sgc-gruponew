DO $$
DECLARE
  v_user_id UUID := '7c092492-4268-448f-bb7c-2d0fa3708e5f';
  v_profile_id UUID;
BEGIN
  -- Insert administrator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'administrador')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Get Super Admin profile
  SELECT id INTO v_profile_id FROM public.security_profiles WHERE name = 'Super Admin' LIMIT 1;

  -- Update profiles table
  UPDATE public.profiles
  SET role = 'administrador',
      security_profile_id = v_profile_id,
      user_status = 'ativo'
  WHERE id = v_user_id;
END $$;
