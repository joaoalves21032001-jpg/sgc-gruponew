import { supabase } from '@/integrations/supabase/client';

export class AuthService {
  /**
   * Realiza o login do usuário (Email e Senha).
   * No futuro, para o Active Directory, a chamada de API deve ser colocada aqui
   * no lugar de `supabase.auth.signInWithPassword`.
   */
  static async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw new Error('Erro ao fazer login. Tente novamente.');
    }
    
    return data;
  }

  /**
   * Envia uma solicitação de troca/reset de senha.
   * Se já existir uma solicitação pendente para este e-mail, substitui (upsert).
   */
  static async requestPasswordReset(email: string, nova_senha: string, motivo: string) {
    // Check for existing pending request to avoid duplicates
    const { data: existing } = await supabase
      .from('password_reset_requests' as any)
      .select('id')
      .eq('email', email)
      .eq('status', 'pendente')
      .limit(1);
    
    if (existing && (existing as any[]).length > 0) {
      // Overwrite the existing pending request
      const { error } = await supabase
        .from('password_reset_requests' as any)
        .update({ nova_senha, motivo, updated_at: new Date().toISOString() } as any)
        .eq('id', (existing as any[])[0].id);
      if (error) {
        // If can't update directly (e.g. no hash column), fall through to edge function
        console.warn('Could not update existing pending request directly, using edge function:', error.message);
      } else {
        return { success: true, updated: true };
      }
    }
    
    const { data, error } = await supabase.functions.invoke('request-password-reset', {
      body: { email, nova_senha, motivo }
    });
    
    if (error) {
      throw new Error(error.message || 'Erro de permissão ou rede.');
    }
    
    if (data?.error) {
       throw new Error(data.error);
    }
    
    return data;
  }
}

