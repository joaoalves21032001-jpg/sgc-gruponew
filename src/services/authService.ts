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
   * Atualmente, chama uma Edge Function do Supabase. Para o AD,
   * poderá acionar um endpoint customizado ou o processo do próprio AD.
   */
  static async requestPasswordReset(email: string, nova_senha: string, motivo: string) {
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
