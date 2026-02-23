import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Toaster as Sonner } from '@/components/ui/sonner';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import logo from '@/assets/logo-grupo-new.png';
import {
  Shield, Heart, Users, Phone, Mail, MapPin,
  CheckCircle, ArrowRight, Star, Send, Building2,
  FileText, ChevronDown
} from 'lucide-react';
import { maskPhone } from '@/lib/masks';

interface Companhia {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface Produto {
  id: string;
  nome: string;
  companhia_id: string;
}

interface Modalidade {
  id: string;
  nome: string;
  quantidade_vidas: string;
}

const CO_PARTICIPACAO_OPTIONS = [
  { value: 'completa', label: 'Co-participação Completa' },
  { value: 'sem', label: 'Sem Co-participação' },
  { value: 'parcial', label: 'Co-participação Parcial' },
];

export default function LandingPage() {
  const [companhias, setCompanhias] = useState<Companhia[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [email, setEmail] = useState('');
  const [companhiaId, setCompanhiaId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [vidas, setVidas] = useState('1');
  const [comDental, setComDental] = useState(false);
  const [coParticipacao, setCoParticipacao] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [compRes, modRes] = await Promise.all([
        supabase.from('companhias').select('id, nome, logo_url').order('nome'),
        supabase.from('modalidades').select('id, nome, quantidade_vidas').order('nome'),
      ]);
      if (compRes.data) setCompanhias(compRes.data);
      if (modRes.data) setModalidades(modRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!companhiaId) { setProdutos([]); setProdutoId(''); return; }
    const fetchProdutos = async () => {
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, companhia_id')
        .eq('companhia_id', companhiaId)
        .order('nome');
      setProdutos(data ?? []);
      setProdutoId('');
    };
    fetchProdutos();
  }, [companhiaId]);

  const selectedCompanhia = companhias.find(c => c.id === companhiaId);
  const selectedProduto = produtos.find(p => p.id === produtoId);
  const selectedModalidade = modalidades.find(m => m.nome === modalidade);

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
          nome: nome.trim(),
          contato: contato.trim(),
          email: email.trim() || null,
          companhia_nome: selectedCompanhia?.nome || null,
          produto_nome: selectedProduto?.nome || null,
          modalidade: modalidade || null,
          quantidade_vidas: parseInt(vidas) || 1,
          com_dental: comDental,
          co_participacao: CO_PARTICIPACAO_OPTIONS.find(o => o.value === coParticipacao)?.label || null,
        },
      });
      if (error) throw error;
      toast.success('Cotação enviada com sucesso! Entraremos em contato em breve.');
      setNome(''); setContato(''); setEmail('');
      setCompanhiaId(''); setProdutoId(''); setModalidade('');
      setVidas('1'); setComDental(false); setCoParticipacao('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar cotação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Sonner />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[hsl(194,53%,26%)] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <img src={logoWhite} alt="Grupo NEW" className="h-9" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#beneficios" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Benefícios</a>
            <a href="#operadoras" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Operadoras</a>
            <a href="#cotacao" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Cotação</a>
          </nav>
          <a href="#cotacao" className="bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,45%)] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-md">
            Solicitar Cotação
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(194,53%,26%)] via-[hsl(194,53%,22%)] to-[hsl(194,60%,16%)] py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[hsl(93,53%,51%)] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-[hsl(194,40%,38%)] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-6 backdrop-blur-sm border border-white/10">
              <Star className="w-3.5 h-3.5 text-[hsl(93,53%,51%)]" /> Consultoria especializada em planos de saúde
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              O plano de saúde <br />
              <span className="text-[hsl(93,53%,51%)]">ideal para você</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed">
              Compare as melhores operadoras do mercado e encontre o plano que cabe no seu bolso. Atendimento consultivo e personalizado.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href="#cotacao" className="inline-flex items-center justify-center gap-2 bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,45%)] text-white px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg shadow-[hsl(93,53%,51%)]/20 hover:shadow-xl hover:shadow-[hsl(93,53%,51%)]/30">
                Solicitar Cotação Grátis <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-12 flex items-center gap-8 text-white/60 text-sm">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> Sem compromisso</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> 100% gratuito</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" /> Resposta em 24h</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section id="beneficios" className="py-20 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Por que escolher o <span className="text-[hsl(194,53%,26%)]">Grupo NEW</span>?
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Mais do que vender planos, entregamos soluções sob medida para cada perfil.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Consultoria Imparcial', desc: 'Comparamos todas as operadoras para encontrar a melhor relação custo-benefício.' },
              { icon: Heart, title: 'Atendimento Humanizado', desc: 'Cada cliente é único. Analisamos suas necessidades antes de recomendar.' },
              { icon: Users, title: 'Planos PF e PJ', desc: 'Soluções para pessoa física, familiar, PME e empresarial.' },
              { icon: FileText, title: 'Análise Completa', desc: 'Carência, cobertura, rede credenciada e reajuste explicados de forma transparente.' },
              { icon: Building2, title: 'Múltiplas Operadoras', desc: 'Acesso às melhores operadoras do mercado em um só lugar.' },
              { icon: Star, title: 'Pós-venda Dedicado', desc: 'Acompanhamento contínuo para garantir sua satisfação e resolver qualquer questão.' },
            ].map((item, i) => (
              <div key={i} className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[hsl(194,53%,26%)]/20 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[hsl(194,20%,94%)] flex items-center justify-center mb-5 group-hover:bg-[hsl(194,53%,26%)] transition-colors">
                  <item.icon className="w-6 h-6 text-[hsl(194,53%,26%)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPERADORAS (Dynamic) ── */}
      <section id="operadoras" className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nossas <span className="text-[hsl(194,53%,26%)]">Operadoras</span> Parceiras
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Trabalhamos com as maiores e melhores operadoras do Brasil.
            </p>
          </div>
          {companhias.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {companhias.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center gap-3 hover:shadow-lg hover:border-[hsl(194,53%,26%)]/20 transition-all duration-300 aspect-square"
                >
                  {comp.logo_url ? (
                    <img src={comp.logo_url} alt={comp.nome} className="w-20 h-20 object-contain" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[hsl(194,20%,94%)] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[hsl(194,53%,26%)]" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{comp.nome}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">Carregando operadoras...</div>
          )}
        </div>
      </section>

      {/* ── QUOTE FORM ── */}
      <section id="cotacao" className="py-20 sm:py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: CTA */}
            <div className="lg:sticky lg:top-28">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Solicite sua <span className="text-[hsl(93,53%,51%)]">cotação gratuita</span>
              </h2>
              <p className="mt-4 text-lg text-gray-500 leading-relaxed">
                Preencha o formulário e um consultor especializado entrará em contato com a melhor proposta para você.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Comparação entre operadoras',
                  'Análise personalizada do seu perfil',
                  'Melhor custo-benefício garantido',
                  'Atendimento sem compromisso',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[hsl(93,53%,51%)]/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-[hsl(93,53%,51%)]" />
                    </div>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 space-y-6">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Nome Completo *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" className="h-12 rounded-xl border-gray-200 focus:border-[hsl(194,53%,26%)] focus:ring-[hsl(194,53%,26%)]" required />
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
                <Label className="text-sm font-semibold text-gray-700">Operadora</Label>
                <Select value={companhiaId} onValueChange={setCompanhiaId}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Selecione a operadora" /></SelectTrigger>
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
                    {CO_PARTICIPACAO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Incluir Dental?</Label>
                  <p className="text-xs text-gray-400 mt-0.5">Cobertura odontológica adicional</p>
                </div>
                <Switch checked={comDental} onCheckedChange={setComDental} />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl bg-[hsl(93,53%,51%)] hover:bg-[hsl(93,55%,45%)] text-white font-bold text-base shadow-lg shadow-[hsl(93,53%,51%)]/20 hover:shadow-xl transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5" /> Enviar Cotação
                  </div>
                )}
              </Button>

              <p className="text-xs text-gray-400 text-center">
                Ao enviar, você concorda com nossa política de privacidade. Seus dados são protegidos.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[hsl(194,53%,26%)] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src={logoWhite} alt="Grupo NEW" className="h-8" />
            <div className="flex items-center gap-6 text-white/60 text-sm">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> (11) 0000-0000</span>
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> contato@gruponew.com.br</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/40">
            © {new Date().getFullYear()} Grupo NEW. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
