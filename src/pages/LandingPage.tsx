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
  CheckCircle, ArrowRight, Star, Send, Building2,
  FileText, Sparkles, TrendingUp, Award, Stethoscope, UserCheck
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
  const [companhiaId, setCompanhiaId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [vidas, setVidas] = useState('1');
  const [comDental, setComDental] = useState(false);
  const [coParticipacao, setCoParticipacao] = useState('');
  const [consultorId, setConsultorId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [compRes, modRes] = await Promise.all([
        supabase.from('companhias').select('id, nome, logo_url').order('nome'),
        supabase.from('modalidades').select('id, nome, quantidade_vidas').order('nome'),
      ]);
      if (compRes.data) setCompanhias(compRes.data);
      if (modRes.data) setModalidades(modRes.data);

      // Fetch consultores via edge function (public, no auth needed)
      try {
        const { data } = await supabase.functions.invoke('get-leaders', {});
        if (data && Array.isArray(data)) {
          setConsultores(data);
        }
      } catch { /* ignore */ }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!companhiaId) { setProdutos([]); setProdutoId(''); return; }
    supabase.from('produtos').select('id, nome, companhia_id')
      .eq('companhia_id', companhiaId).order('nome')
      .then(({ data }) => { setProdutos(data ?? []); setProdutoId(''); });
  }, [companhiaId]);

  const selectedCompanhia = companhias.find(c => c.id === companhiaId);
  const selectedProduto = produtos.find(p => p.id === produtoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !contato.trim()) {
      toast.error('Preencha seu nome e telefone.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('landing-lead', {
        body: {
          nome: nome.trim(), contato: contato.trim(), email: email.trim() || null,
          companhia_nome: selectedCompanhia?.nome || null,
          produto_nome: selectedProduto?.nome || null,
          modalidade: modalidade || null,
          quantidade_vidas: parseInt(vidas) || 1,
          com_dental: comDental,
          co_participacao: CO_PARTICIPACAO.find(o => o.value === coParticipacao)?.label || null,
          consultor_recomendado_id: (consultorId && consultorId !== 'none') ? consultorId : null,
        },
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar cotação.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNome(''); setContato(''); setEmail('');
    setCompanhiaId(''); setProdutoId(''); setModalidade('');
    setVidas('1'); setComDental(false); setCoParticipacao('');
    setConsultorId(''); setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <img src={logo} alt="Grupo NEW" className="h-10" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#beneficios" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Benefícios</a>
            <a href="#companhias" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Companhias</a>
            <a href="#cotacao" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Cotação</a>
          </nav>
          <a href="#cotacao" className="bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,42%)] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-[hsl(93,53%,51%)]/25 hover:shadow-xl hover:scale-105 active:scale-95">
            Cotar Agora
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(194,53%,26%)] via-[hsl(194,53%,20%)] to-[hsl(194,60%,14%)]" />
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[hsl(93,53%,51%)]/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[hsl(194,40%,38%)]/20 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-[hsl(93,53%,51%)]" />
              <span className="text-white/90 text-sm font-medium">Consultoria especializada em planos de saúde</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Encontre o plano{' '}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(93,53%,51%)] to-[hsl(93,45%,62%)]">
                  perfeito
                </span>
              </span>{' '}
              para você
            </h1>

            <p className="mt-8 text-xl text-white/60 max-w-xl leading-relaxed">
              Compare as melhores companhias do mercado. Atendimento consultivo, personalizado e <strong className="text-white/80">100% gratuito</strong>.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href="#cotacao" className="group inline-flex items-center justify-center gap-3 bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,42%)] text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-[hsl(93,53%,51%)]/30 hover:shadow-[hsl(93,53%,51%)]/40 hover:scale-[1.02] active:scale-[0.98]">
                Solicitar Cotação Grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { num: '50+', label: 'Companhias parceiras' },
                { num: '10k+', label: 'Vidas protegidas' },
                { num: '98%', label: 'Satisfação' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-extrabold text-[hsl(93,53%,51%)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.num}</p>
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
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> Sem compromisso</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> 100% gratuito</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> Resposta em 24h</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> Dados protegidos</div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" className="py-24 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="text-[hsl(93,53%,51%)] text-sm font-bold uppercase tracking-[0.2em]">Vantagens</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Por que o <span className="text-[hsl(194,53%,26%)]">Grupo NEW</span>?
            </h2>
            <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">
              Mais do que vender planos, entregamos soluções sob medida.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Consultoria Imparcial', desc: 'Comparamos todas as companhias para encontrar a melhor relação custo-benefício para o seu perfil.', color: 'from-blue-500 to-cyan-500' },
              { icon: Heart, title: 'Atendimento Humanizado', desc: 'Cada cliente é único. Analisamos suas necessidades antes de fazer qualquer recomendação.', color: 'from-rose-500 to-pink-500' },
              { icon: Users, title: 'PF, Familiar e PJ', desc: 'Soluções completas para pessoa física, familiar, PME e empresarial com as melhores condições.', color: 'from-violet-500 to-purple-500' },
              { icon: Stethoscope, title: 'Análise Completa', desc: 'Carência, cobertura, rede credenciada e reajuste explicados de forma clara e transparente.', color: 'from-emerald-500 to-green-500' },
              { icon: Building2, title: 'Múltiplas Companhias', desc: 'Acesso às melhores companhias de saúde do mercado em um só lugar.', color: 'from-amber-500 to-orange-500' },
              { icon: Award, title: 'Pós-venda Dedicado', desc: 'Acompanhamento contínuo para garantir sua satisfação e resolver qualquer questão rapidamente.', color: 'from-indigo-500 to-blue-500' },
            ].map((item, i) => (
              <div key={i} className="group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</h3>
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
            <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">
              Trabalhamos com as maiores e melhores companhias de saúde do Brasil.
            </p>
          </div>

          {companhias.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {companhias.map((comp) => (
                <div key={comp.id} className="group bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:border-[hsl(194,53%,26%)]/20 hover:-translate-y-1 transition-all duration-300 aspect-square cursor-default">
                  {comp.logo_url ? (
                    <img src={comp.logo_url} alt={comp.nome} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(194,20%,94%)] to-[hsl(194,30%,88%)] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[hsl(194,53%,26%)]" />
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-700 text-center leading-tight">{comp.nome}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Carregando companhias...
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 bg-[hsl(194,53%,26%)] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[hsl(93,53%,51%)]/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Pronto para encontrar o plano ideal?
          </h2>
          <p className="mt-4 text-lg text-white/60 max-w-xl mx-auto">
            Preencha nossa cotação gratuita e receba propostas personalizadas das melhores companhias.
          </p>
          <a href="#cotacao" className="inline-flex items-center gap-3 mt-8 bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,42%)] text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-black/20 hover:scale-[1.02]">
            <Send className="w-5 h-5" /> Solicitar Cotação
          </a>
        </div>
      </section>

      {/* ── QUOTE FORM ── */}
      <section id="cotacao" className="py-24 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-16 items-start">
            {/* Left: CTA */}
            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <span className="text-[hsl(93,53%,51%)] text-sm font-bold uppercase tracking-[0.2em]">Cotação</span>
              <h2 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Solicite sua cotação <span className="text-[hsl(93,53%,51%)]">gratuita</span>
              </h2>
              <p className="mt-5 text-gray-500 leading-relaxed">
                Preencha o formulário e um consultor especializado entrará em contato com a melhor proposta.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Comparação entre companhias',
                  'Análise personalizada do seu perfil',
                  'Melhor custo-benefício garantido',
                  'Resposta em até 24 horas',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(93,53%,51%)]/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" />
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(194,53%,26%)] flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Prefere ligar?</p>
                    <p className="text-xs text-gray-400">Atendimento de seg a sex, 9h às 18h</p>
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-[hsl(194,53%,26%)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>(11) 0000-0000</p>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-[hsl(93,53%,51%)]/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-[hsl(93,53%,51%)]" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Cotação enviada!</h3>
                  <p className="mt-3 text-gray-500 max-w-sm mx-auto">
                    Recebemos sua solicitação. Um consultor entrará em contato em até 24 horas com as melhores propostas.
                  </p>
                  <Button onClick={resetForm} variant="outline" className="mt-8 rounded-xl px-8 h-12 font-semibold">
                    Enviar nova cotação
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 sm:p-10 space-y-5">
                  <div className="pb-4 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dados para cotação</h3>
                    <p className="text-sm text-gray-400 mt-1">Campos com * são obrigatórios</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Nome Completo *</Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" className="h-12 rounded-xl border-gray-200 focus:border-[hsl(194,53%,26%)] focus:ring-[hsl(194,53%,26%)]/20" required />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Telefone *</Label>
                      <Input value={contato} onChange={e => setContato(maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-12 rounded-xl border-gray-200" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">E-mail</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="h-12 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Companhia</Label>
                    <Select value={companhiaId} onValueChange={setCompanhiaId}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione a companhia" /></SelectTrigger>
                      <SelectContent>
                        {companhias.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              {c.logo_url && <img src={c.logo_url} alt="" className="w-5 h-5 object-contain" />}
                              {c.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {produtos.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Produto / Plano</Label>
                      <Select value={produtoId} onValueChange={setProdutoId}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                        <SelectContent>
                          {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Modalidade</Label>
                      <Select value={modalidade} onValueChange={setModalidade}>
                        <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {modalidades.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Quantidade de Vidas</Label>
                      <Input type="number" min="1" value={vidas} onChange={e => setVidas(e.target.value)} className="h-12 rounded-xl border-gray-200" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700">Co-participação</Label>
                    <Select value={coParticipacao} onValueChange={setCoParticipacao}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CO_PARTICIPACAO.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-100">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Incluir Dental?</Label>
                      <p className="text-xs text-gray-400 mt-0.5">Cobertura odontológica adicional</p>
                    </div>
                    <Switch checked={comDental} onCheckedChange={setComDental} />
                  </div>

                  {/* Consultor recomendado */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[hsl(194,53%,26%)]" /> Indicação de Consultor
                    </Label>
                    <p className="text-xs text-gray-400">Alguém te indicou? Selecione o consultor.</p>
                    <Select value={consultorId} onValueChange={setConsultorId}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Nenhuma indicação" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma indicação</SelectItem>
                        {consultores.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_completo} ({c.cargo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[hsl(93,53%,51%)] to-[hsl(93,55%,42%)] hover:from-[hsl(93,55%,45%)] hover:to-[hsl(93,57%,38%)] text-white font-bold text-lg shadow-xl shadow-[hsl(93,53%,51%)]/25 hover:shadow-2xl hover:shadow-[hsl(93,53%,51%)]/35 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Send className="w-5 h-5" /> Enviar Cotação Gratuita
                      </div>
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    🔒 Seus dados são protegidos e não serão compartilhados.
                  </p>
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
            <img src={logoWhite} alt="Grupo NEW" className="h-9" />
            <div className="flex items-center gap-8 text-white/50 text-sm">
              <span className="flex items-center gap-2 hover:text-white/80 transition-colors"><Phone className="w-4 h-4" /> (11) 0000-0000</span>
              <span className="flex items-center gap-2 hover:text-white/80 transition-colors"><Mail className="w-4 h-4" /> contato@gruponew.com.br</span>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/10 text-center text-xs text-white/30">
            © {new Date().getFullYear()} Grupo NEW. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
