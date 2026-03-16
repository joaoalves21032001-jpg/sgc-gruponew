import { useState, useEffect } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Shield, UserPlus, Info, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { maskCPF, maskRG, maskPhone } from '@/lib/masks';
import { AuthService } from '@/services/authService';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import logo from '@/assets/logo-grupo-new.png';

interface PendingResetState {
  id: string;
  status: string;
  admin_resposta?: string;
  email: string;
}

interface PendingAccessState {
  id: string;
  status: string;
  motivo_recusa?: string;
  email: string;
}

interface LeaderOption {
  id: string;
  nome_completo: string;
  cargo: string;
}

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    nome: '', email: '', telefone: '', mensagem: '',
    cpf: '', endereco: '', cargo: '',
    nivel_acesso: '', numero_emergencia_1: '', numero_emergencia_2: '',
    nome_emergencia_1: '', vinculo_emergencia_1: '', 
    nome_emergencia_2: '', vinculo_emergencia_2: '',
    data_admissao: '', data_nascimento: '',
    senha: '', confirmacao_senha: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [supervisores, setSupervisores] = useState<LeaderOption[]>([]);
  const [gerentes, setGerentes] = useState<LeaderOption[]>([]);
  const [cargosData, setCargosData] = useState<{ id: string, nome: string, requires_leader: boolean, nivel_supervisao?: 'ninguem' | 'supervisor' | 'gerente' | 'diretor' }[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedGerente, setSelectedGerente] = useState('');
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', nova_senha: '', confirmacao_senha: '', motivo: '' });
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [pendingReset, setPendingReset] = useState<PendingResetState | null>(null);
  const [pendingAccess, setPendingAccess] = useState<PendingAccessState | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }

    const savedReset = sessionStorage.getItem('pending_reset');
    if (savedReset) {
      try {
        setPendingReset(JSON.parse(savedReset));
      } catch (e) {
        console.error("Failed to parse stored pending reset", e);
      }
    }
    
    const savedAccess = localStorage.getItem('pending_access');
    if (savedAccess) {
      try {
        setPendingAccess(JSON.parse(savedAccess));
      } catch (e) {
        console.error("Failed to parse stored pending access", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!pendingReset?.id) return;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const { data: funcData, error } = await supabase.functions.invoke('get-password-reset-status', {
          body: { request_id: pendingReset.id }
        });
        
        if (!error && funcData?.data && isMounted) {
           const { status, admin_resposta } = funcData.data;
           setPendingReset(prev => prev ? ({ ...prev, status: status || 'pendente', admin_resposta: admin_resposta || undefined }) : null);
           if (status === 'aprovado') {
             toast.success('Senha redefinida com sucesso! Acesso liberado.');
             setTimeout(() => handleClearPending(), 3000);
           }
        }
      } catch (e) {
        console.error('Error polling status:', e);
      }
    };
    fetchStatus();

    // Polling fallback every 5 seconds to guarantee updates even if realtime fails
    const pollInterval = setInterval(fetchStatus, 5000);

    // Realtime channel WITHOUT row-level filter (to avoid REPLICA IDENTITY issues)
    // We filter client-side instead.
    const channel = supabase
      .channel(`pwd-reset-watch-${pendingReset.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'password_reset_requests' },
        (payload) => {
          const updated = payload.new as any;
          // Only care about our specific request
          if (updated.id !== pendingReset.id) return;
          const { status, admin_resposta } = updated;
          if (!isMounted) return;
          setPendingReset(prev => prev ? { ...prev, status, admin_resposta } : null);
          
          if (status === 'aprovado') {
             toast.success('Senha redefinida com sucesso! Acesso liberado.');
             setTimeout(() => handleClearPending(), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [pendingReset?.id]);

  const handleClearPending = () => {
    setPendingReset(null);
    sessionStorage.removeItem('pending_reset');
  };

  const handleCancelReset = async () => {
    if (!pendingReset?.id) { handleClearPending(); return; }
    try {
      // Call a function to cancel - bypasses RLS issues for anon users
      // Falls back to direct update if function not available
      const { error } = await supabase.functions.invoke('cancel-password-reset', {
        body: { request_id: pendingReset.id },
      });
      if (error) {
        // Fallback: try direct update (works if RLS allows it)
        await supabase
          .from('password_reset_requests')
          .update({ status: 'cancelado' } as any)
          .eq('id', pendingReset.id);
      }
    } catch { /* silently ignore – local state is still cleared */ }
    handleClearPending();
    toast.info('Solicitação cancelada.');
  };

  const handleCorrigirReset = () => {
    setForgotForm(prev => ({ ...prev, email: pendingReset?.email || '' }));
    handleClearPending();
    setShowForgotPassword(true);
  };

  useEffect(() => {
    if (!pendingAccess?.id) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('status, motivo_recusa')
        .eq('id', pendingAccess.id)
        .single();
      
      if (!error && data) {
        const newStatus = data.status || 'pendente';
        // Se já está aprovado ao carregar, desbloquear imediatamente
        if (newStatus === 'aprovado') {
          toast.success('Acesso Liberado! O administrador aprovou o seu cadastro.');
          handleClearPendingAccess();
          return;
        }
        setPendingAccess(prev => prev ? ({ ...prev, status: newStatus, motivo_recusa: data.motivo_recusa || undefined }) : null);
      }
    };
    fetchStatus();

    const channel = supabase
      .channel(`public:access_requests:id=eq.${pendingAccess.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'access_requests', filter: `id=eq.${pendingAccess.id}` },
        (payload) => {
          const { status, motivo_recusa } = payload.new as any;
          setPendingAccess(prev => prev ? { ...prev, status, motivo_recusa } : null);
          
          if (status === 'aprovado') {
             toast.success('Acesso Liberado! O administrador aprovou o seu cadastro.');
             setTimeout(() => handleClearPendingAccess(), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingAccess?.id]);

  const handleClearPendingAccess = () => {
    setPendingAccess(null);
    localStorage.removeItem('pending_access');
  };

  const handleCorrigirAcesso = async () => {
    if (!pendingAccess?.id) return;
    try {
      const { data, error } = await supabase.from('access_requests').select('*').eq('id', pendingAccess.id).single();
      if (!error && data) {
         setRequestForm({
            nome: data.nome || '', email: data.email || '', telefone: data.telefone || '', mensagem: data.mensagem || '',
            cpf: data.cpf || '', endereco: data.endereco || '', cargo: data.cargo || '',
            nivel_acesso: data.nivel_acesso || '', numero_emergencia_1: data.numero_emergencia_1 || '', numero_emergencia_2: data.numero_emergencia_2 || '',
            nome_emergencia_1: data.nome_emergencia_1 || '', vinculo_emergencia_1: data.vinculo_emergencia_1 || '', 
            nome_emergencia_2: data.nome_emergencia_2 || '', vinculo_emergencia_2: data.vinculo_emergencia_2 || '',
            data_admissao: data.data_admissao || '', data_nascimento: data.data_nascimento || '',
            senha: '', confirmacao_senha: ''
         });
         setSelectedSupervisor(data.supervisor_id || 'nenhum');
         setSelectedGerente(data.gerente_id || 'nenhum');
      }
    } catch {}
    handleClearPendingAccess();
    setShowRequest(true);
  };

  useEffect(() => {
    if (!showRequest) return;
    const fetchData = async () => {
      try {
        const [leadersRes, cargosRes] = await Promise.all([
          supabase.functions.invoke('get-leaders'),
          supabase.from('cargos').select('id, nome, requires_leader, nivel_supervisao')
        ]);
        
        if (leadersRes.error) throw leadersRes.error;
        if (cargosRes.error) throw cargosRes.error;

        const leaders = (leadersRes.data || []) as LeaderOption[];
        setSupervisores(leaders.filter(p => p.cargo === 'Supervisor'));
        setGerentes(leaders.filter(p => p.cargo === 'Gerente' || p.cargo === 'Diretor'));
        
        setCargosData((cargosRes.data as any) || []);
      } catch (err) {
        console.error('Error fetching data for request access form:', err);
      }
    };
    fetchData();
  }, [showRequest]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.login(email, password);
      // Salvar credenciais se remember me estiver marcado
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
      toast.success('Login realizado com sucesso!');
      
      // Let React Router and PublicRoute handle the redirect to '/' automatically
      // Removing hard navigation to prevent wiping the internal auth state.
      
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado. Tente novamente.');
      console.error(err);
      setLoading(false); // Only stop loading on error, so UI doesn't unlock during redirect
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotForm.email.trim() || !forgotForm.nova_senha.trim() || !forgotForm.confirmacao_senha.trim() || !forgotForm.motivo.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }
    if (forgotForm.nova_senha !== forgotForm.confirmacao_senha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/.test(forgotForm.nova_senha)) {
      toast.error('A nova senha deve ter no mínimo 12 caracteres, incluir uma letra maiúscula, uma minúscula e um caractere especial.');
      return;
    }
    setSubmittingForgot(true);
    try {
      // Verificação Inteligente: Tentar logar com a "nova" senha. 
      // Se der sucesso, significa que o usuário digitou a própria senha atual sem saber!
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: forgotForm.email,
        password: forgotForm.nova_senha
      });

      if (!signInError && signInData?.user) {
         // O usuário "descobriu" a senha atual sem querer ao tentar resetar.
         // Faremos logout rápido para não cruzar estados de sessão na tela de esqueci senha,
         // e avisaremos o usuário.
         await supabase.auth.signOut();
         toast.info('Atenção: A nova senha informada JÁ É a sua senha atual! Não enviamos a solicitação porque você já tem acesso com ela.', { duration: 8000 });
         setShowForgotPassword(false);
         setForgotForm({ email: '', nova_senha: '', confirmacao_senha: '', motivo: '' });
         setSubmittingForgot(false);
         return;
      }

      // Se falhou no login (erro de credencial inválida), a senha é de fato diferente da atual.
      // E podemos seguir com a solicitação de troca.
      const resp = await AuthService.requestPasswordReset(forgotForm.email, forgotForm.nova_senha, forgotForm.motivo);
      
      const resetState = { id: resp.id, status: 'pendente', email: forgotForm.email };
      setPendingReset(resetState);
      sessionStorage.setItem('pending_reset', JSON.stringify(resetState));

      toast.success('Solicitação de troca de senha enviada aos administradores.');
      setShowForgotPassword(false);
      setForgotForm({ email: '', nova_senha: '', confirmacao_senha: '', motivo: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar troca de senha.');
    } finally {
      setSubmittingForgot(false);
    }
  };

  const handleAccessRequest = async () => {
    if (!requestForm.nome.trim() || !requestForm.email.trim() || !requestForm.telefone.trim() ||
      !requestForm.cpf.trim() || !requestForm.endereco.trim() ||
      !requestForm.senha.trim() || !requestForm.confirmacao_senha.trim()) {
      toast.error('Preencha todos os campos obrigatórios (incluindo a senha).');
      return;
    }
    if (requestForm.senha !== requestForm.confirmacao_senha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/.test(requestForm.senha)) {
      toast.error('A senha deve ter no mínimo 12 caracteres, incluir uma letra maiúscula, uma minúscula e um caractere especial.');
      return;
    }
    // Validate supervisor/gerente based on cargo
    const cargo = requestForm.cargo;
    if (!cargo) {
      toast.error('Selecione um cargo.');
      return;
    }
    const selectedCargoObj = cargosData.find(c => c.nome === cargo);
    const requiresLeader = selectedCargoObj ? selectedCargoObj.requires_leader !== false : true;

    let needSupervisor = false;
    let needGerente = false;

    if (selectedCargoObj) {
        if (selectedCargoObj.nivel_supervisao === 'ninguem') {
            needSupervisor = false;
            needGerente = false;
        } else {
            needSupervisor = true;
            needGerente = true;
        }
    } else if (requiresLeader) {
        needSupervisor = true;
        needGerente = true;
    }

    if (needSupervisor && !selectedSupervisor) {
        toast.error('Selecione o Supervisor ou "Nenhum".');
        return;
    }
    if (needGerente && !selectedGerente) {
        toast.error('Selecione o Gerente.');
        return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-access', {
        body: {
          nome: requestForm.nome, email: requestForm.email, telefone: requestForm.telefone,
          mensagem: requestForm.mensagem || null, cpf: requestForm.cpf,
          endereco: requestForm.endereco, cargo: requestForm.cargo,
          nivel_acesso: requestForm.nivel_acesso,
          numero_emergencia_1: requestForm.numero_emergencia_1 || null,
          nome_emergencia_1: requestForm.nome_emergencia_1 || null,
          vinculo_emergencia_1: requestForm.vinculo_emergencia_1 || null,
          numero_emergencia_2: requestForm.numero_emergencia_2 || null,
          nome_emergencia_2: requestForm.nome_emergencia_2 || null,
          vinculo_emergencia_2: requestForm.vinculo_emergencia_2 || null,
          supervisor_id: selectedSupervisor === 'nenhum' ? null : selectedSupervisor || null,
          gerente_id: selectedGerente === 'nenhum' ? null : selectedGerente || null,
          data_admissao: requestForm.data_admissao || null,
          data_nascimento: requestForm.data_nascimento || null,
          password: requestForm.senha
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const newId = data?.id;
      if (newId) {
         const accessState = { id: newId, status: 'pendente', email: requestForm.email };
         setPendingAccess(accessState);
         localStorage.setItem('pending_access', JSON.stringify(accessState));
      }

      toast.success('Solicitação enviada! O administrador será notificado.');
      setShowRequest(false);
      setRequestForm({
        nome: '', email: '', telefone: '', mensagem: '',
        cpf: '', endereco: '', cargo: '',
        nivel_acesso: '', numero_emergencia_1: '', numero_emergencia_2: '',
        nome_emergencia_1: '', vinculo_emergencia_1: '', 
        nome_emergencia_2: '', vinculo_emergencia_2: '',
        data_admissao: '', data_nascimento: '',
        senha: '', confirmacao_senha: ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key: string, value: string) => {
    setRequestForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'cargo') {
        const selectedObj = cargosData.find(c => c.nome === value);
        const requiresLeader = selectedObj ? selectedObj.requires_leader !== false : true;
        const isManagerOrDirector = value.toLowerCase().includes('gerente') || value.toLowerCase().includes('diretor');

        if (!requiresLeader || isManagerOrDirector || ['Supervisor'].includes(value)) {
          setSelectedSupervisor('');
        }
        if (!requiresLeader || isManagerOrDirector) {
          setSelectedGerente('');
        }
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-[55%] gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-white/[0.03] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.02] animate-[pulse_12s_ease-in-out_infinite_2s]" />
          <div className="absolute top-[40%] right-[10%] w-[200px] h-[200px] rounded-full bg-white/[0.04] animate-[pulse_6s_ease-in-out_infinite_1s]" />
          <div className="absolute top-[20%] left-[5%] w-[1px] h-[200px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="absolute bottom-[30%] right-[25%] w-[1px] h-[150px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="page-enter">
            <img src={logoWhite} alt="Grupo New" className="h-10 opacity-90" />
          </div>
          <div className="max-w-md page-enter" style={{ animationDelay: '0.15s' }}>
            <h1 className="text-4xl font-extrabold text-white font-display leading-[1.1] tracking-tight">
              Sistema de Gestão Comercial
            </h1>
            <p className="text-white/60 text-base mt-4 leading-relaxed">
              Gerencie sua equipe, acompanhe metas e potencialize resultados com inteligência e eficiência.
            </p>
            <div className="mt-10 flex items-center gap-6 animate-stagger">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white font-display">100%</span>
                <span className="text-xs text-white/40 uppercase tracking-wider mt-1">Digital</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white font-display">Real-time</span>
                <span className="text-xs text-white/40 uppercase tracking-wider mt-1">Dados</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white font-display">Seguro</span>
                <span className="text-xs text-white/40 uppercase tracking-wider mt-1">Protegido</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Grupo New — Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right Panel - Login or Pending Reset Status */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8 page-enter" style={{ animationDelay: '0.1s' }}>
          <div className="lg:hidden mb-8">
            <img src={logo} alt="Grupo New" className="h-12 mx-auto" />
          </div>

          {!pendingReset && !pendingAccess ? (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-brand animate-[pulse_3s_ease-in-out_infinite]">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                  Bem-vindo ao SGC
                </h2>
                <p className="text-sm text-muted-foreground">
                  Acesse com seu e-mail corporativo
                </p>
              </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="seu.email@gruponew.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Senha</label>
                <button
                  type="button"
                  onClick={() => { setForgotForm(f => ({ ...f, email })); setShowForgotPassword(true); }}

                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="rememberMe" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor="rememberMe" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
              >
                Lembrar-me
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-brand transition-all duration-300 mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="bg-accent/50 rounded-xl p-4 border border-border/30">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Autenticação em dois fatores</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Após o login, será necessário verificar sua identidade via Google Authenticator.
                </p>
              </div>
            </div>
          </div>

              <div className="text-center space-y-3">
                <p className="text-xs text-muted-foreground/60">
                  Somente usuários pré-cadastrados por um administrador podem acessar o sistema.
                </p>
                <button
                  onClick={() => setShowRequest(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Não tem acesso? Solicitar ao administrador
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center w-full">
               {pendingReset && pendingReset.status === 'pendente' && (
                 <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Solicitação em Análise</h2>
                  <p className="text-sm text-muted-foreground">
                    Sua redefinição de senha foi enviada para o administrador.<br/>
                    Aguarde nesta tela, você será avisado assim que for finalizada.
                  </p>
                  <Button onClick={handleCancelReset} variant="outline" className="w-full mt-4 font-semibold text-destructive border-destructive/30 hover:bg-destructive/5">
                    Cancelar Solicitação
                  </Button>
                 </>
               )}
               {pendingReset && pendingReset.status === 'aprovado' && (
                 <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Acesso Liberado</h2>
                  <p className="text-sm text-muted-foreground">Sua senha foi atualizada com sucesso. Redirecionando...</p>
                 </>
               )}
               {pendingReset && pendingReset.status === 'devolvido' && (
                 <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Solicitação Devolvida</h2>
                  <p className="text-sm text-muted-foreground">O administrador solicitou ajustes na sua redefinição.</p>
                  <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/30 text-left mt-4">
                    <AlertTitle className="text-amber-600 font-semibold">Justificativa do Administrador</AlertTitle>
                    <AlertDescription className="text-amber-600/90">{pendingReset.admin_resposta}</AlertDescription>
                  </Alert>
                  <Button onClick={handleCorrigirReset} className="w-full mt-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                    Corrigir e Reenviar
                  </Button>
                 </>
               )}
               {pendingReset && pendingReset.status === 'rejeitado' && (
                 <>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">Solicitação Rejeitada</h2>
                  <p className="text-sm text-muted-foreground">Sua solicitação de nova senha foi negada.</p>
                  {pendingReset.admin_resposta && (
                    <Alert variant="destructive" className="text-left mt-4">
                      <AlertTitle className="font-semibold">Justificativa do Administrador</AlertTitle>
                      <AlertDescription>{pendingReset.admin_resposta}</AlertDescription>
                    </Alert>
                  )}
                  <Button onClick={handleClearPending} variant="outline" className="w-full mt-6 font-semibold">
                    Voltar ao Login
                  </Button>
                 </>
               )}
            </div>
          )}

          {pendingAccess && (
            <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-8 shadow-xl animate-fade-in relative overflow-hidden backdrop-blur-xl">
              {pendingAccess.status === 'pendente' && (
                <div className="text-center space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold font-display text-foreground">Solicitação em Análise</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Sua solicitação de acesso foi enviada. O acesso está em análise e em breve você irá obter o retorno.
                    </p>
                  </div>
                </div>
              )}

              {pendingAccess.status === 'devolvido' && (
                <div className="text-center space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-orange-500" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold font-display text-foreground">Atenção Necessária</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Sua solicitação de acesso foi devolvida com a seguinte observação:
                    </p>
                    <div className="bg-orange-500/10 text-orange-600 p-4 rounded-xl text-sm italic font-medium">
                      "{pendingAccess.motivo_recusa || 'Nenhuma justificativa informada'}"
                    </div>
                  </div>
                  <Button onClick={handleCorrigirAcesso} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all shadow-brand hover:shadow-brand-hover">
                    Corrigir Dados
                  </Button>
                </div>
              )}

              {pendingAccess.status === 'rejeitado' && (
                <div className="text-center space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold font-display text-foreground">Acesso Negado</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Lamentamos, mas sua solicitação de acesso foi rejeitada.
                    </p>
                    <div className="bg-red-500/10 text-red-600 p-4 rounded-xl text-sm italic font-medium">
                      "{pendingAccess.motivo_recusa || 'Nenhuma justificativa informada'}"
                    </div>
                  </div>
                  <Button onClick={handleClearPendingAccess} variant="outline" className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 transition-all">
                    Voltar ao Início
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Access Request Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Solicitar Acesso
            </DialogTitle>
            <DialogDescription>
              Preencha seus dados. O administrador, supervisor e gerente serão notificados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-2">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo *</label>
                  <Input value={requestForm.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Seu nome completo" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail *</label>
                  <Input type="email" value={requestForm.email} onChange={(e) => setField('email', e.target.value)} placeholder="seu.email@gmail.com" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Celular *</label>
                  <Input value={requestForm.telefone} onChange={(e) => setField('telefone', maskPhone(e.target.value))} placeholder="(11) 9 9999-9999" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPF *</label>
                  <Input value={requestForm.cpf} onChange={(e) => setField('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" className="h-10" />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço *</label>
                  <Input value={requestForm.endereco} onChange={(e) => setField('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Nascimento *</label>
                  <Input type="date" value={requestForm.data_nascimento} onChange={(e) => setField('data_nascimento', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Admissão</label>
                  <Input type="date" value={requestForm.data_admissao} onChange={(e) => setField('data_admissao', e.target.value)} className="h-10" />
                </div>
              </div>
            </div>

            {/* Contatos de Emergência */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Contatos de Emergência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Primário (Opcional)</label>
                    <Input value={requestForm.numero_emergencia_1} onChange={(e) => setField('numero_emergencia_1', maskPhone(e.target.value))} placeholder="(11) 9 9999-9999" className="h-10" />
                  </div>
                  {requestForm.numero_emergencia_1.replace(/\D/g, '').length > 0 && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
                        <Input value={requestForm.nome_emergencia_1} onChange={(e) => setField('nome_emergencia_1', e.target.value)} placeholder="Nome do contato..." className="h-10" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vínculo</label>
                        <Input value={requestForm.vinculo_emergencia_1} onChange={(e) => setField('vinculo_emergencia_1', e.target.value)} placeholder="Ex: Mãe, Pai..." className="h-10" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Secundário (Opcional)</label>
                    <Input value={requestForm.numero_emergencia_2} onChange={(e) => setField('numero_emergencia_2', maskPhone(e.target.value))} placeholder="(11) 9 9999-9999" className="h-10" />
                  </div>
                  {requestForm.numero_emergencia_2.replace(/\D/g, '').length > 0 && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
                        <Input value={requestForm.nome_emergencia_2} onChange={(e) => setField('nome_emergencia_2', e.target.value)} placeholder="Nome do contato..." className="h-10" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vínculo</label>
                        <Input value={requestForm.vinculo_emergencia_2} onChange={(e) => setField('vinculo_emergencia_2', e.target.value)} placeholder="Ex: Irmão, Tio..." className="h-10" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cargo & Acesso */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Cargo & Acesso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo *</label>
                  <Select value={requestForm.cargo} onValueChange={(v) => {
                      setField('cargo', v);
                      const selectedCargoObj = cargosData.find(c => c.nome === v);
                      if (selectedCargoObj?.nivel_supervisao === 'ninguem') {
                         setSelectedSupervisor('nenhum');
                         setSelectedGerente('nenhum');
                      }
                  }}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione um cargo..." /></SelectTrigger>
                    <SelectContent>
                      {cargosData.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Líderes */}
            {(() => {
                const selectedObj = cargosData.find(c => c.nome === requestForm.cargo);
                const requiresLeader = selectedObj ? selectedObj.requires_leader !== false : true;
                return requiresLeader;
            })() && (
              <div>
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Líderes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!['Supervisor'].includes(requestForm.cargo) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisor *</label>
                      <Select
                        value={selectedSupervisor}
                        onValueChange={setSelectedSupervisor}
                        disabled={cargosData.find(c => c.nome === requestForm.cargo)?.nivel_supervisao === 'ninguem'}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Nenhum</SelectItem>
                          {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gerente *</label>
                    <Select
                      value={selectedGerente}
                      onValueChange={setSelectedGerente}
                      disabled={cargosData.find(c => c.nome === requestForm.cargo)?.nivel_supervisao === 'ninguem'}
                    >
                      <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        {gerentes.map(g => <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Senha */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Senha de Acesso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senha *</label>
                  <Input type="password" value={requestForm.senha} onChange={(e) => setField('senha', e.target.value)} placeholder="Mínimo 12 caracteres (Aa#)" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirme a Senha *</label>
                  <Input type="password" value={requestForm.confirmacao_senha} onChange={(e) => setField('confirmacao_senha', e.target.value)} placeholder="Confirme sua senha" className="h-10" />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagem (Opcional)</label>
              <Textarea value={requestForm.mensagem} onChange={(e) => setField('mensagem', e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRequest(false)}>Cancelar</Button>
            <Button onClick={handleAccessRequest} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {submitting ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Esqueci Minha Senha
            </DialogTitle>
            <DialogDescription>
              Solicite uma nova senha. Os administradores irão avaliar e aprovar o resete para a senha que você definir abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail corporativo *</label>
              <Input type="email" value={forgotForm.email} onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })} placeholder="seu.email@gruponew.com.br" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nova Senha *</label>
              <Input type="password" value={forgotForm.nova_senha} onChange={(e) => setForgotForm({ ...forgotForm, nova_senha: e.target.value })} placeholder="Min 12 caracteres (Aa#)" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmar Nova Senha *</label>
              <Input type="password" value={forgotForm.confirmacao_senha} onChange={(e) => setForgotForm({ ...forgotForm, confirmacao_senha: e.target.value })} placeholder="Confirme a nova senha" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motivo da Solicitação *</label>
              <Textarea value={forgotForm.motivo} onChange={(e) => setForgotForm({ ...forgotForm, motivo: e.target.value })} placeholder="Ex: Esqueci a senha atual" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForgotPassword(false)}>Cancelar</Button>
            <Button onClick={handleForgotPassword} disabled={submittingForgot} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {submittingForgot ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Solicitar Resete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
