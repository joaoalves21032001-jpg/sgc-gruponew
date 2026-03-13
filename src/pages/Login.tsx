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
import { Shield, UserPlus, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { maskCPF, maskRG, maskPhone } from '@/lib/masks';
import { AuthService } from '@/services/authService';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import logo from '@/assets/logo-grupo-new.png';

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
    cpf: '', rg: '', endereco: '', cargo: '',
    nivel_acesso: '', numero_emergencia_1: '', numero_emergencia_2: '',
    nome_emergencia_1: '', vinculo_emergencia_1: '', 
    nome_emergencia_2: '', vinculo_emergencia_2: '',
    data_admissao: '', data_nascimento: '',
    senha: '', confirmacao_senha: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [supervisores, setSupervisores] = useState<LeaderOption[]>([]);
  const [gerentes, setGerentes] = useState<LeaderOption[]>([]);
  const [cargosData, setCargosData] = useState<{ id: string, nome: string, requires_leader: boolean }[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedGerente, setSelectedGerente] = useState('');
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', nova_senha: '', confirmacao_senha: '', motivo: '' });
  const [submittingForgot, setSubmittingForgot] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!showRequest) return;
    const fetchData = async () => {
      try {
        const [leadersRes, cargosRes] = await Promise.all([
          supabase.functions.invoke('get-leaders'),
          supabase.from('cargos').select('id, nome, requires_leader')
        ]);
        
        if (leadersRes.error) throw leadersRes.error;
        if (cargosRes.error) throw cargosRes.error;

        const leaders = (leadersRes.data || []) as LeaderOption[];
        setSupervisores(leaders.filter(p => p.cargo === 'Supervisor'));
        setGerentes(leaders.filter(p => p.cargo === 'Gerente' || p.cargo === 'Diretor'));
        
        setCargosData(cargosRes.data || []);
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
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
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
    if (forgotForm.nova_senha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSubmittingForgot(true);
    try {
      await AuthService.requestPasswordReset(forgotForm.email, forgotForm.nova_senha, forgotForm.motivo);
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
      !requestForm.cpf.trim() || !requestForm.rg.trim() || !requestForm.endereco.trim() ||
      !requestForm.senha.trim() || !requestForm.confirmacao_senha.trim()) {
      toast.error('Preencha todos os campos obrigatórios (incluindo a senha).');
      return;
    }
    if (requestForm.senha !== requestForm.confirmacao_senha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (requestForm.senha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    // Validate supervisor/gerente based on cargo
    const cargo = requestForm.cargo;
    if (!cargo) {
      toast.error('Selecione um cargo.');
      return;
    }
    const isManagerOrDirector = cargo.toLowerCase().includes('gerente') || cargo.toLowerCase().includes('diretor');
    const selectedCargoObj = cargosData.find(c => c.nome === cargo);
    const requiresLeader = selectedCargoObj ? selectedCargoObj.requires_leader !== false : true;

    if (requiresLeader) {
        if (!isManagerOrDirector && !['Supervisor'].includes(cargo) && !selectedSupervisor) {
          toast.error('Selecione o Supervisor ou "Nenhum".');
          return;
        }
        if (!isManagerOrDirector && !selectedGerente) {
          toast.error('Selecione o Gerente.');
          return;
        }
    }
    setSubmitting(true);
    try {
      const nomeEmergencia1Concat = requestForm.vinculo_emergencia_1 ? `${requestForm.nome_emergencia_1} (${requestForm.vinculo_emergencia_1})` : requestForm.nome_emergencia_1;
      const nomeEmergencia2Concat = requestForm.vinculo_emergencia_2 ? `${requestForm.nome_emergencia_2} (${requestForm.vinculo_emergencia_2})` : requestForm.nome_emergencia_2;

      const { data, error } = await supabase.functions.invoke('request-access', {
        body: {
          nome: requestForm.nome, email: requestForm.email, telefone: requestForm.telefone,
          mensagem: requestForm.mensagem || null, cpf: requestForm.cpf, rg: requestForm.rg,
          endereco: requestForm.endereco, cargo: requestForm.cargo,
          nivel_acesso: requestForm.nivel_acesso,
          numero_emergencia_1: requestForm.numero_emergencia_1 || null,
          numero_emergencia_2: requestForm.numero_emergencia_2 || null,
          nome_emergencia_1: nomeEmergencia1Concat || null,
          nome_emergencia_2: nomeEmergencia2Concat || null,
          supervisor_id: selectedSupervisor === 'nenhum' ? null : selectedSupervisor || null,
          gerente_id: selectedGerente || null,
          data_admissao: requestForm.data_admissao || null,
          data_nascimento: requestForm.data_nascimento || null,
          password: requestForm.senha
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Solicitação enviada! O administrador será notificado.');
      setShowRequest(false);
      setRequestForm({
        nome: '', email: '', telefone: '', mensagem: '',
        cpf: '', rg: '', endereco: '', cargo: '',
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

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8 page-enter" style={{ animationDelay: '0.1s' }}>
          <div className="lg:hidden mb-8">
            <img src={logo} alt="Grupo New" className="h-12 mx-auto" />
          </div>
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
                  onClick={() => setShowForgotPassword(true)}
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
          <div className="space-y-5 py-2">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo *</label>
                  <Input value={requestForm.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Seu nome completo" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail *</label>
                  <Input type="email" value={requestForm.email} onChange={(e) => setField('email', e.target.value)} placeholder="seu.email@gmail.com" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Celular *</label>
                  <Input value={requestForm.telefone} onChange={(e) => setField('telefone', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPF *</label>
                  <Input value={requestForm.cpf} onChange={(e) => setField('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RG *</label>
                  <Input value={requestForm.rg} onChange={(e) => setField('rg', maskRG(e.target.value))} placeholder="00.000.000-0" className="h-10" />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço *</label>
                  <Input value={requestForm.endereco} onChange={(e) => setField('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Nascimento *</label>
                  <Input type="date" value={requestForm.data_nascimento} onChange={(e) => setField('data_nascimento', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de Admissão</label>
                  <Input type="date" value={requestForm.data_admissao} onChange={(e) => setField('data_admissao', e.target.value)} className="h-10" />
                </div>
              </div>
            </div>

            {/* Contatos de Emergência */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Contatos de Emergência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 1 (Opcional)</label>
                    <Input value={requestForm.numero_emergencia_1} onChange={(e) => setField('numero_emergencia_1', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                  </div>
                  {requestForm.numero_emergencia_1.trim() && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Contato 1</label>
                        <Input value={requestForm.nome_emergencia_1} onChange={(e) => setField('nome_emergencia_1', e.target.value)} placeholder="Nome do contato..." className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vínculo</label>
                        <Input value={requestForm.vinculo_emergencia_1} onChange={(e) => setField('vinculo_emergencia_1', e.target.value)} placeholder="Ex: Mãe, Pai..." className="h-10" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 2 (Opcional)</label>
                    <Input value={requestForm.numero_emergencia_2} onChange={(e) => setField('numero_emergencia_2', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                  </div>
                  {requestForm.numero_emergencia_2.trim() && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Contato 2</label>
                        <Input value={requestForm.nome_emergencia_2} onChange={(e) => setField('nome_emergencia_2', e.target.value)} placeholder="Nome do contato..." className="h-10" />
                      </div>
                      <div className="space-y-1.5">
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
                  <Select value={requestForm.cargo} onValueChange={(v) => setField('cargo', v)}>
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
                const isManagerOrDirector = requestForm.cargo.toLowerCase().includes('gerente') || requestForm.cargo.toLowerCase().includes('diretor');
                return requiresLeader && !isManagerOrDirector;
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
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Nenhum (responde ao Gerente)</SelectItem>
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
                    >
                      <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
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
                  <Input type="password" value={requestForm.senha} onChange={(e) => setField('senha', e.target.value)} placeholder="Mínimo 6 caracteres" className="h-10" />
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
              <Input type="password" value={forgotForm.nova_senha} onChange={(e) => setForgotForm({ ...forgotForm, nova_senha: e.target.value })} placeholder="Digite a nova senha desejada" className="h-10" />
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
