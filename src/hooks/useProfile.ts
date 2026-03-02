import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  codigo: string | null;
  nome_completo: string;
  apelido: string | null;
  email: string;
  celular: string | null;
  cpf: string | null;
  rg: string | null;
  endereco: string | null;
  numero_emergencia_1: string | null;
  numero_emergencia_2: string | null;
  cargo: string;
  supervisor_id: string | null;
  gerente_id: string | null;
  avatar_url: string | null;
  meta_faturamento: number;
  atividades_desabilitadas: boolean;
  progresso_desabilitado: boolean;
  acoes_desabilitadas: boolean;
  disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  role: 'consultor' | 'supervisor' | 'gerente' | 'administrador';
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, supervisor:profiles!profiles_supervisor_id_fkey(id, nome_completo, email), gerente:profiles!profiles_gerente_id_fkey(id, nome_completo, email)`)
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      // Flatten supervisor/gerente into the profile for easy access
      const profile = data as any;
      if (profile) {
        profile._supervisor = profile.supervisor || null;
        profile._gerente = profile.gerente || null;
        delete profile.supervisor;
        delete profile.gerente;
      }
      return profile as (Profile & { _supervisor?: { id: string; nome_completo: string; email: string } | null; _gerente?: { id: string; nome_completo: string; email: string } | null }) | null;
    },
    enabled: !!user,
  });
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as UserRole | null)?.role ?? 'consultor';
    },
    enabled: !!user,
  });
}

export function useSupervisorProfile(supervisorId: string | null | undefined) {
  return useQuery({
    queryKey: ['supervisor-profile', supervisorId],
    queryFn: async () => {
      if (!supervisorId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .eq('id', supervisorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!supervisorId,
  });
}

export function useGerenteProfile(gerenteId: string | null | undefined) {
  return useQuery({
    queryKey: ['gerente-profile', gerenteId],
    queryFn: async () => {
      if (!gerenteId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_completo, email')
        .eq('id', gerenteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!gerenteId,
  });
}

export function useTeamProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-profiles', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: !!user,
  });
}
