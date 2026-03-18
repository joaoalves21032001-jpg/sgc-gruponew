import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import logo from '@/assets/logo-grupo-new.png';
import {
  Shield, Heart, Users, Phone, Mail,
  CheckCircle, ArrowRight, Send, Building2,
  Sparkles, Award, Stethoscope, UserCheck,
  MapPin, ChevronDown,
} from 'lucide-react';
import { maskPhone } from '@/lib/masks';

interface Companhia { id: string; nome: string; logo_url: string | null; }
interface Produto { id: string; nome: string; companhia_id: string; }
interface Modalidade { id: string; nome: string; quantidade_vidas: string; }
interface Consultor { id: string; nome_completo: string; cargo: string; }

const CO_PARTICIPACAO = [
  { value: 'completa', label: 'Co-participação Completa' },
  { value: 'sem', label: 'Sem Co-participação' },
  { value: 'parcial', label: 'Co-participação Parcial' },
];

const ANUNCIO_OPCOES = ['Google', 'Instagram', 'Facebook', 'WhatsApp', 'YouTube', 'LinkedIn'];

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export default function LandingPage() {
  const [companhias, setCompanhias] = useState<Companhia[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [email, setEmail] = useState('');
  const [companhiasInteresse, setCompanhiasInteresse] = useState<string[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [tipoContratacao, setTipoContratacao] = useState<'cpf' | 'cnpj' | ''>('');
  const [cnpjNumero, setCnpjNumero] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [vidas, setVidas] = useState('1');
  const [comDental, setComDental] = useState(false);
  const [coParticipacao, setCoParticipacao] = useState('');
  const [fonteConheceu, setFonteConheceu] = useState<'anuncio' | 'consultor' | 'outro' | ''>('');
  const [anuncioPlataforma, setAnuncioPlataforma] = useState('');
  const [consultorId, setConsultorId] = useState('');
  const [outraIndicacao, setOutraIndicacao] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [compRes, modRes] = await Promise.all([
        supabase.from('companhias').select('id, nome, logo_url').order('nome'),
        supabase.from('modalidades').select('id, nome, quantidade_vidas').order('nome'),
      ]);
      if (compRes.data) setCompanhias(compRes.data);
      if (modRes.data) setModalidades(modRes.data);
      try {
        const { data } = await supabase.functions.invoke('get-leaders', {});
        if (data && Array.isArray(data)) setConsultores(data);
      } catch { /* ignore */ }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (companhiasInteresse.length === 0) { setProdutos([]); setProdutoId(''); return; }
    const c = companhias.find(c => c.nome === companhiasInteresse[0]);
    if (!c) { setProdutos([]); return; }
    supabase.from('produtos').select('id, nome, companhia_id')
      .eq('companhia_id', c.id).order('nome')
      .then(({ data }) => { setProdutos(data ?? []); setProdutoId(''); });
  }, [companhiasInteresse, companhias]);

  const toggleCompanhia = (nome: string) => {
    setCompanhiasInteresse(prev => {
      if (prev.includes(nome)) return prev.filter(n => n !== nome);
      if (prev.length >= 3) return prev;
      return [...prev, nome];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !contato.trim()) { toast.error('Preencha seu nome e telefone.'); return; }
    setLoading(true);
    try {
      const selectedProduto = produtos.find(p => p.id === produtoId);
      const fonte = fonteConheceu === 'anuncio' ? `Anúncio - ${anuncioPlataforma}`
        : fonteConheceu === 'consultor' ? `Indicação de Consultor`
        : fonteConheceu === 'outro' ? `Outro: ${outraIndicacao}` : null;

      const { error } = await supabase.functions.invoke('landing-lead', {
        body: {
          nome: nome.trim(), contato: contato.trim(), email: email.trim() || null,
          companhia_nome: companhiasInteresse.join(', ') || null,
          produto_nome: selectedProduto?.nome || null,
          modalidade: modalidade || null,
          quantidade_vidas: parseInt(vidas) || 1,
          com_dental: comDental,
          co_participacao: CO_PARTICIPACAO.find(o => o.value === coParticipacao)?.label || null,
          consultor_recomendado_id: (fonteConheceu === 'consultor' && consultorId && consultorId !== 'none') ? consultorId : null,
          regiao_preferencia: [estado, cidade, bairro].filter(Boolean).join(', ') || null,
          tipo_contratacao: tipoContratacao || null,
          cnpj: tipoContratacao === 'cnpj' ? cnpjNumero.trim() || null : null,
          fonte_conheceu: fonte,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar cotação.');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setNome(''); setContato(''); setEmail(''); setCompanhiasInteresse([]); setProdutoId('');
    setModalidade(''); setVidas('1'); setComDental(false); setCoParticipacao('');
    setConsultorId(''); setSubmitted(false); setEstado(''); setCidade(''); setBairro('');
    setTipoContratacao(''); setCnpjNumero(''); setFonteConheceu(''); setAnuncioPlataforma(''); setOutraIndicacao('');
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <img src={logo} alt="Vitaliza Seguros" className="h-10" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#beneficios" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Benefícios</a>
            <a href="#companhias" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Companhias</a>
            <a href="#cotacao" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Cotação</a>
          </nav>
          <a href="#cotacao" className="bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,42%)] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg">Cotar Agora</a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(194,53%,26%)] via-[hsl(194,53%,20%)] to-[hsl(194,60%,14%)]" />
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[hsl(93,53%,51%)]/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[hsl(194,40%,38%)]/20 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-[hsl(93,53%,51%)]" />
              <span className="text-white/90 text-sm font-medium">Consultoria especializada em planos de saúde</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Encontre o plano{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(93,53%,51%)] to-[hsl(93,45%,62%)]">perfeito</span>{' '}para você
            </h1>
            <p className="mt-8 text-xl text-white/60 max-w-xl leading-relaxed">
              Compare as melhores companhias do mercado. Atendimento consultivo, personalizado e <strong className="text-white/80">100% gratuito</strong>.
            </p>
            <div className="mt-10">
              <a href="#cotacao" className="group inline-flex items-center gap-3 bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,42%)] text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-2xl">
                Solicitar Cotação Grátis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[{ num: '50+', label: 'Companhias parceiras' }, { num: '10k+', label: 'Vidas protegidas' }, { num: '98%', label: 'Satisfação' }].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-extrabold text-[hsl(93,53%,51%)]">{s.num}</p>
                  <p className="text-xs text-white/40 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-gray-50 py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-8 flex-wrap text-sm text-gray-400 font-medium">
          {['Sem compromisso', '100% gratuito', 'Resposta em 24h', 'Dados protegidos'].map(t => (
            <div key={t} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> {t}</div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" className="py-24 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-[hsl(93,53%,51%)] text-sm font-bold uppercase tracking-[0.2em]">Vantagens</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Por que o <span className="text-[hsl(194,53%,26%)]">Vitaliza Seguros</span>?
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Consultoria Imparcial', desc: 'Comparamos todas as companhias para encontrar a melhor relação custo-benefício.', color: 'from-blue-500 to-cyan-500' },
              { icon: Heart, title: 'Atendimento Humanizado', desc: 'Cada cliente é único. Analisamos suas necessidades antes de fazer qualquer recomendação.', color: 'from-rose-500 to-pink-500' },
              { icon: Users, title: 'PF, Familiar e PJ', desc: 'Soluções para pessoa física, familiar, PME e empresarial.', color: 'from-violet-500 to-purple-500' },
              { icon: Stethoscope, title: 'Análise Completa', desc: 'Carência, cobertura e rede credenciada explicados claramente.', color: 'from-emerald-500 to-green-500' },
              { icon: Building2, title: 'Múltiplas Companhias', desc: 'Acesso às melhores companhias de saúde do mercado.', color: 'from-amber-500 to-orange-500' },
              { icon: Award, title: 'Pós-venda Dedicado', desc: 'Acompanhamento contínuo para garantir sua satisfação.', color: 'from-indigo-500 to-blue-500' },
            ].map((item, i) => (
              <div key={i} className="group bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPANHIAS ── */}
      <section id="companhias" className="py-24 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[hsl(93,53%,51%)] text-sm font-bold uppercase tracking-[0.2em]">Parceiros</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nossas <span className="text-[hsl(194,53%,26%)]">Companhias</span>
            </h2>
          </div>
          {companhias.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {companhias.map((comp) => (
                <div key={comp.id} className="group bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:-translate-y-1 transition-all aspect-square">
                  {comp.logo_url ? <img src={comp.logo_url} alt={comp.nome} className="w-20 h-20 object-contain" /> : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(194,20%,94%)] to-[hsl(194,30%,88%)] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[hsl(194,53%,26%)]" />
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-700 text-center">{comp.nome}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />Carregando companhias...</div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 bg-[hsl(194,53%,26%)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[hsl(93,53%,51%)]/10 rounded-full blur-[120px]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Pronto para encontrar o plano ideal?</h2>
          <a href="#cotacao" className="inline-flex items-center gap-3 mt-8 bg-[hsl(93,53%,51%)] text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-2xl">
            <Send className="w-5 h-5" /> Solicitar Cotação
          </a>
        </div>
      </section>

      {/* ── QUOTE FORM ── */}
      <section id="cotacao" className="py-24 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-16 items-start">
            {/* Left */}
            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <span className="text-[hsl(93,53%,51%)] text-sm font-bold uppercase tracking-[0.2em]">Cotação</span>
              <h2 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Solicite sua cotação <span className="text-[hsl(93,53%,51%)]">gratuita</span>
              </h2>
              <div className="mt-8 space-y-4">
                {['Comparação entre companhias', 'Análise personalizada do seu perfil', 'Melhor custo-benefício garantido', 'Resposta em até 24 horas'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(93,53%,51%)]/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" />
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(194,53%,26%)] flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div><p className="text-sm font-bold text-gray-900">Prefere ligar?</p><p className="text-xs text-gray-400">Seg a sex, 9h às 18h</p></div>
                </div>
                <p className="text-2xl font-extrabold text-[hsl(194,53%,26%)]">(11) 0000-0000</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-[hsl(93,53%,51%)]/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-[hsl(93,53%,51%)]" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">Cotação enviada!</h3>
                  <p className="mt-3 text-gray-500 max-w-sm mx-auto">Recebemos sua solicitação. Um consultor entrará em contato em até 24 horas.</p>
                  <Button onClick={resetForm} variant="outline" className="mt-8 rounded-xl px-8 h-12 font-semibold">Enviar nova cotação</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 sm:p-10 space-y-5">
                  <div className="pb-4 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Dados para cotação</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Apenas <strong>Nome</strong> e <strong>Telefone</strong> são obrigatórios — todos os demais campos são opcionais.
                    </p>
                  </div>

                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Nome Completo *</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" className="h-12 rounded-xl border-gray-200" required />
                  </div>

                  {/* Telefone + Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Telefone *</Label>
                      <Input value={contato} onChange={e => setContato(maskPhone(e.target.value))} placeholder="(11) 9 9999-9999" className="h-12 rounded-xl border-gray-200" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">E-mail</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="h-12 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  {/* Companhia de interesse (multi, max 3) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700">Companhia de interesse</Label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${companhiasInteresse.length >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {companhiasInteresse.length}/3 selecionadas
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                      {companhias.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">Carregando companhias...</p>}
                      {companhias.map(c => {
                        const sel = companhiasInteresse.includes(c.nome);
                        const atLimit = companhiasInteresse.length >= 3 && !sel;
                        return (
                          <button key={c.id} type="button" disabled={atLimit} onClick={() => toggleCompanhia(c.nome)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 text-left transition-colors ${sel ? 'bg-[hsl(194,53%,26%)]/8 text-[hsl(194,53%,26%)] font-semibold' : atLimit ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${sel ? 'bg-[hsl(194,53%,26%)] border-[hsl(194,53%,26%)]' : 'border-gray-300'}`}>
                              {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            {c.logo_url && <img src={c.logo_url} alt="" className="w-5 h-5 object-contain" />}
                            {c.nome}
                          </button>
                        );
                      })}
                    </div>
                    {companhiasInteresse.length >= 3 && <p className="text-[10px] text-amber-600 mt-1">⚠ Limite atingido — máx. 3 companhias</p>}
                  </div>

                  {/* Produto */}
                  {produtos.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Produto / Plano</Label>
                      <Select value={produtoId} onValueChange={setProdutoId}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                        <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Região de preferência */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[hsl(194,53%,26%)]" /> Região de preferência
                    </Label>
                    <p className="text-xs text-gray-400">Informe onde prefere que o plano tenha cobertura.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Estado</p>
                        <Select value={estado} onValueChange={setEstado}>
                          <SelectTrigger className="h-11 rounded-xl border-gray-200 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>{ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-gray-500 font-medium">Cidade</p>
                        <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: São Paulo" className="h-11 rounded-xl border-gray-200 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium">Bairro / Endereço (opcional)</p>
                      <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Ex: Vila Madalena ou Av. Paulista, 1000" className="h-11 rounded-xl border-gray-200 text-sm" />
                    </div>
                  </div>

                  {/* Tipo de contratação */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tipo de contratação</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ value: 'cpf', label: 'CPF', sub: 'Pessoa Física' }, { value: 'cnpj', label: 'CNPJ', sub: 'Pessoa Jurídica / Empresa' }].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setTipoContratacao(opt.value as 'cpf' | 'cnpj')}
                          className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${tipoContratacao === opt.value ? 'border-[hsl(194,53%,26%)] bg-[hsl(194,53%,26%)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                          <span className={`text-sm font-bold ${tipoContratacao === opt.value ? 'text-[hsl(194,53%,26%)]' : 'text-gray-700'}`}>{opt.label}</span>
                          <span className="text-xs text-gray-400 mt-0.5">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    {tipoContratacao === 'cnpj' && (
                      <div className="space-y-1 mt-2">
                        <p className="text-xs text-gray-500 font-medium">Número do CNPJ (opcional)</p>
                        <Input value={cnpjNumero} onChange={e => setCnpjNumero(e.target.value)} placeholder="00.000.000/0001-00" className="h-11 rounded-xl border-gray-200" />
                      </div>
                    )}
                  </div>

                  {/* Modalidade + Vidas */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Modalidade</Label>
                      <Select value={modalidade} onValueChange={setModalidade}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{modalidades.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Quantidade de Vidas</Label>
                      <Input type="number" min="1" value={vidas} onChange={e => setVidas(e.target.value)} className="h-12 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  {/* Co-participação */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Modalidade de co-participação</Label>
                    <Select value={coParticipacao} onValueChange={setCoParticipacao}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{CO_PARTICIPACAO.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* Dental */}
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Incluir Dental?</Label>
                      <p className="text-xs text-gray-400 mt-0.5">Cobertura odontológica adicional</p>
                    </div>
                    <Switch checked={comDental} onCheckedChange={setComDental} />
                  </div>

                  {/* Por onde nos conheceu? */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[hsl(194,53%,26%)]" /> Por onde nos conheceu?
                    </Label>
                    <div className="space-y-2">
                      {/* Anúncio */}
                      <div className={`border rounded-xl overflow-hidden ${fonteConheceu === 'anuncio' ? 'border-[hsl(194,53%,26%)]' : 'border-gray-200'}`}>
                        <button type="button" onClick={() => setFonteConheceu(fonteConheceu === 'anuncio' ? '' : 'anuncio')}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                          <span>📢 Anúncio</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${fonteConheceu === 'anuncio' ? 'rotate-180' : ''}`} />
                        </button>
                        {fonteConheceu === 'anuncio' && (
                          <div className="px-4 pb-3 pt-1 grid grid-cols-3 gap-2 border-t border-gray-100 bg-gray-50/50">
                            {ANUNCIO_OPCOES.map(p => (
                              <button key={p} type="button" onClick={() => setAnuncioPlataforma(p)}
                                className={`text-xs py-2 px-3 rounded-lg border font-medium transition-colors ${anuncioPlataforma === p ? 'bg-[hsl(194,53%,26%)] text-white border-[hsl(194,53%,26%)]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Indicação de Consultor */}
                      <div className={`border rounded-xl overflow-hidden ${fonteConheceu === 'consultor' ? 'border-[hsl(194,53%,26%)]' : 'border-gray-200'}`}>
                        <button type="button" onClick={() => setFonteConheceu(fonteConheceu === 'consultor' ? '' : 'consultor')}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                          <span>🤝 Indicação de Consultor</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${fonteConheceu === 'consultor' ? 'rotate-180' : ''}`} />
                        </button>
                        {fonteConheceu === 'consultor' && (
                          <div className="px-4 pb-3 pt-1 border-t border-gray-100 bg-gray-50/50">
                            <Select value={consultorId} onValueChange={setConsultorId}>
                              <SelectTrigger className="h-11 rounded-xl border-gray-200 text-sm"><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Prefiro não informar</SelectItem>
                                {consultores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo} ({c.cargo})</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Outras indicações */}
                      <div className={`border rounded-xl overflow-hidden ${fonteConheceu === 'outro' ? 'border-[hsl(194,53%,26%)]' : 'border-gray-200'}`}>
                        <button type="button" onClick={() => setFonteConheceu(fonteConheceu === 'outro' ? '' : 'outro')}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                          <span>💬 Outras indicações</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${fonteConheceu === 'outro' ? 'rotate-180' : ''}`} />
                        </button>
                        {fonteConheceu === 'outro' && (
                          <div className="px-4 pb-3 pt-1 border-t border-gray-100 bg-gray-50/50">
                            <Input value={outraIndicacao} onChange={e => setOutraIndicacao(e.target.value)}
                              placeholder="Onde nos conheceu? Ex: amigo, evento, rádio..." className="h-11 rounded-xl border-gray-200 text-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[hsl(93,53%,51%)] to-[hsl(93,55%,42%)] text-white font-bold text-lg shadow-xl transition-all hover:scale-[1.01]">
                    {loading ? (
                      <div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</div>
                    ) : (
                      <div className="flex items-center gap-3"><Send className="w-5 h-5" /> Enviar Cotação Gratuita</div>
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">🔒 Seus dados são protegidos e não serão compartilhados.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[hsl(194,53%,26%)] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <img src={logoWhite} alt="Vitaliza Seguros" className="h-9" />
            <div className="flex items-center gap-8 text-white/50 text-sm">
              <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> (11) 0000-0000</span>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> contato@gruponew.com.br</span>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/10 text-center text-xs text-white/30">
            © {new Date().getFullYear()} Vitaliza Seguros. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
