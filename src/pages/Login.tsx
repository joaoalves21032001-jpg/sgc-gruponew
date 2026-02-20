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
import { maskCPF, maskRG, maskPhone } from '@/lib/masks';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import logo from '@/assets/logo-grupo-new.png';

const CARGOS = ['Consultor de Vendas', 'Supervisor', 'Gerente', 'Diretor'];

interface LeaderOption {
  id: string;
  nome_completo: string;
  cargo: string;
}

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    nome: '', email: '', telefone: '', mensagem: '',
    cpf: '', rg: '', endereco: '', cargo: 'Consultor de Vendas',
    nivel_acesso: 'consultor', numero_emergencia_1: '', numero_emergencia_2: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [supervisores, setSupervisores] = useState<LeaderOption[]>([]);
  const [gerentes, setGerentes] = useState<LeaderOption[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedGerente, setSelectedGerente] = useState('');

  useEffect(() => {
    if (!showRequest) return;
    const fetchLeaders = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome_completo, cargo')
        .in('cargo', ['Supervisor', 'Gerente', 'Diretor'])
        .eq('disabled', false)
        .order('nome_completo');
      if (data) {
        setSupervisores(data.filter(p => p.cargo === 'Supervisor'));
        setGerentes(data.filter(p => p.cargo === 'Gerente' || p.cargo === 'Diretor'));
      }
    };
    fetchLeaders();
  }, [showRequest]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error('Erro ao fazer login com Google. Tente novamente.');
        console.error(error);
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async () => {
    if (!requestForm.nome.trim() || !requestForm.email.trim() || !requestForm.telefone.trim() ||
        !requestForm.cpf.trim() || !requestForm.rg.trim() || !requestForm.endereco.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    // Validate supervisor/gerente based on cargo
    const cargo = requestForm.cargo;
    if (!['Supervisor', 'Gerente', 'Diretor'].includes(cargo) && !selectedSupervisor) {
      toast.error('Selecione o Supervisor.');
      return;
    }
    if (!['Gerente', 'Diretor'].includes(cargo) && !selectedGerente) {
      toast.error('Selecione o Gerente.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('notify-access-request', {
        body: requestForm,
      });
      if (error) throw error;
      toast.success('Solicitação enviada! O administrador será notificado.');
      setShowRequest(false);
      setRequestForm({
        nome: '', email: '', telefone: '', mensagem: '',
        cpf: '', rg: '', endereco: '', cargo: 'Consultor de Vendas',
        nivel_acesso: 'consultor', numero_emergencia_1: '', numero_emergencia_2: '',
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
        if (['Supervisor', 'Gerente', 'Diretor'].includes(value)) {
          setSelectedSupervisor('');
        }
        if (['Gerente', 'Diretor'].includes(value)) {
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
          <div className="absolute top-[-10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.02]" />
          <div className="absolute top-[40%] right-[10%] w-[200px] h-[200px] rounded-full bg-white/[0.04]" />
          <div className="absolute top-[20%] left-[5%] w-[1px] h-[200px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="absolute bottom-[30%] right-[25%] w-[1px] h-[150px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img src={logoWhite} alt="Grupo New" className="h-10 opacity-90" />
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-extrabold text-white font-display leading-[1.1] tracking-tight">
              Sistema de Gestão Comercial
            </h1>
            <p className="text-white/60 text-base mt-4 leading-relaxed">
              Gerencie sua equipe, acompanhe metas e potencialize resultados com inteligência e eficiência.
            </p>
            <div className="mt-10 flex items-center gap-6">
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
        <div className="w-full max-w-[420px] space-y-8">
          <div className="lg:hidden mb-8">
            <img src={logo} alt="Grupo New" className="h-12 mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-brand">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
              Bem-vindo ao SGC
            </h2>
            <p className="text-sm text-muted-foreground">
              Acesse com sua conta Google corporativa
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-14 border-border/60 bg-card hover:bg-accent transition-all duration-200 group text-foreground font-medium text-[15px] shadow-card"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </>
            )}
          </Button>

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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail (Google) *</label>
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
            </div>

            {/* Contatos de Emergência */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Contatos de Emergência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 1 (Opcional)</label>
                  <Input value={requestForm.numero_emergencia_1} onChange={(e) => setField('numero_emergencia_1', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergência 2 (Opcional)</label>
                  <Input value={requestForm.numero_emergencia_2} onChange={(e) => setField('numero_emergencia_2', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
              </div>
            </div>

            {/* Cargo & Acesso */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Cargo & Acesso</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</label>
                  <Select value={requestForm.cargo} onValueChange={(v) => setField('cargo', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nível de Acesso</label>
                  <Select value={requestForm.nivel_acesso} onValueChange={(v) => setField('nivel_acesso', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultor">Usuário</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Líderes */}
            {!['Gerente', 'Diretor'].includes(requestForm.cargo) && (
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Líderes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!['Supervisor', 'Gerente', 'Diretor'].includes(requestForm.cargo) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisor *</label>
                  <Select 
                    value={selectedSupervisor} 
                    onValueChange={setSelectedSupervisor}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
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
    </div>
  );
};

export default Login;
