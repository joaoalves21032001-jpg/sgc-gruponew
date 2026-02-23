import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logoWhite from '@/assets/logo-grupo-new-white.png';
import heroImage from '@/assets/hero-banner.jpg';
import {
  BarChart3, Users, ShieldCheck, Target, TrendingUp, Zap,
  ArrowRight, CheckCircle2, Phone, Mail, MapPin, Star
} from 'lucide-react';

const features = [
  { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'Acompanhe KPIs, metas e desempenho da equipe em tempo real com gráficos dinâmicos.' },
  { icon: Users, title: 'CRM Kanban', desc: 'Gerencie leads com pipeline visual drag-and-drop, validações automáticas e histórico completo.' },
  { icon: ShieldCheck, title: 'Aprovações Seguras', desc: 'Fluxo hierárquico de aprovações com logs de auditoria e rastreabilidade total.' },
  { icon: Target, title: 'Metas & Gamificação', desc: 'Sistema de patentes e rankings que motivam a equipe a superar objetivos.' },
  { icon: TrendingUp, title: 'Relatórios Avançados', desc: 'Visão consolidada por consultor, equipe e período com filtros inteligentes.' },
  { icon: Zap, title: 'Automação', desc: 'Notificações em tempo real, validação de documentos e preenchimento inteligente.' },
];

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '+500', label: 'Vendas gerenciadas' },
  { value: '24/7', label: 'Suporte ativo' },
  { value: '100%', label: 'Seguro' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoWhite} alt="Grupo New" className="h-8 invert dark:invert-0" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-sm font-semibold">
              Entrar
            </Button>
            <Button size="sm" onClick={() => navigate('/login')} className="font-semibold shadow-brand gap-1.5">
              Acessar Plataforma <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="outline" className="text-xs font-semibold px-3 py-1 border-primary/30 text-primary">
                <Star className="w-3 h-3 mr-1" /> Plataforma SGC
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-[1.1] tracking-tight">
                Gestão Comercial <span className="text-primary">Inteligente</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                A plataforma completa para gerenciar vendas, equipes e metas do Grupo New. 
                Controle total com segurança e eficiência.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button size="lg" onClick={() => navigate('/login')} className="font-bold shadow-brand gap-2 text-base px-8">
                  Começar Agora <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="font-semibold text-base px-8">
                  Ver Recursos
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                {['SSL Seguro', 'LGPD Compliant', 'Multi-dispositivo'].map(item => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" /> {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/30 bg-card">
                <img src={heroImage} alt="Plataforma SGC" className="w-full h-auto object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card rounded-xl p-4 shadow-xl border border-border/30 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversão</p>
                    <p className="text-lg font-bold font-display text-foreground">+32%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary/[0.03] border-y border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold font-display text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="text-xs font-semibold px-3 py-1 mb-4">Recursos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold font-display">Tudo que você precisa</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Ferramentas poderosas para cada etapa do processo comercial
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-card rounded-2xl p-6 border border-border/30 shadow-card hover:shadow-card-hover transition-shadow group">
                <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-bold font-display text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary/[0.03] border-t border-border/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Pronto para transformar sua gestão?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Acesse a plataforma e eleve os resultados da sua equipe.
          </p>
          <Button size="lg" onClick={() => navigate('/login')} className="font-bold shadow-brand gap-2 text-base px-10">
            Acessar a Plataforma <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img src={logoWhite} alt="Grupo New" className="h-7 invert dark:invert-0 mb-3" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Plataforma SGC — Sistema de Gestão Comercial do Grupo New.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">Login</button></li>
                <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">Recursos</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">Contato</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> contato@gruponew.com.br</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> (11) 0000-0000</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/20 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Grupo New. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
