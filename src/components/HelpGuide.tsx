import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, LayoutDashboard, Briefcase, BarChart3, UserCircle,
  ClipboardList, ShoppingCart, FileText, Shield, ChevronRight, Upload, Flag, Trophy,
  TrendingUp, Package, Bell, Kanban
} from 'lucide-react';
import { useUserRole } from '@/hooks/useProfile';
import { useMyTabPermissions, isTabEnabled } from '@/hooks/useTabPermissions';

interface HelpGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HelpSection {
  icon: React.ElementType;
  title: string;
  content: string[];
  access: 'all' | 'supervisor_up' | 'admin';
  tabKey?: string; // matches tab permission key
}

const sections: HelpSection[] = [
  {
    icon: LayoutDashboard,
    title: 'Meu Progresso',
    access: 'all',
    tabKey: 'progresso',
    content: [
      'O Dashboard exibe um resumo das suas atividades e vendas do mês.',
      'Os cards mostram KPIs como ligações, cotações e vendas.',
      'A patente é atualizada automaticamente com base no % da meta atingida.',
      'Patentes: Bronze (80-89%), Prata (90-99%), Ouro (100%+), Platina (150%+), Diamante (200%+).',
      'Se sua meta estiver abaixo de 80%, você verá uma frase motivacional de apoio.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Registrar Atividades',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse Comercial → aba Atividades.',
      'Preencha TODOS os campos numéricos (mesmo que seja 0).',
      'As taxas de conversão são calculadas automaticamente.',
      'Clique em REGISTRAR ATIVIDADES para salvar.',
      'Para lançamento retroativo (data passada), é obrigatória uma justificativa.',
      'Supervisor e gerente receberão notificação automática por e-mail.',
    ],
  },
  {
    icon: Upload,
    title: 'Importar Atividades via CSV',
    access: 'all',
    tabKey: 'comercial',
    content: [
      '1. Clique em "Modelo" para baixar a planilha padrão.',
      '2. Preencha seguindo o formato: dd/mm/aaaa para datas, valores numéricos inteiros.',
      '3. Exemplo de linha: 12/02/2026;15;20;8;6;4;2;3',
      '4. Separe as colunas com ponto e vírgula (;) ou vírgula (,).',
      '5. Salve o arquivo como CSV (UTF-8).',
      '6. Clique em "Upload" e selecione o arquivo.',
      '7. Um resumo será exibido para conferência antes de confirmar.',
      '8. Datas retroativas exigirão justificativa individual para cada dia.',
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Registrar Venda',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse Comercial → aba Nova Venda.',
      'Siga o wizard de 4 etapas:',
      '1. Modalidade — Selecione o tipo de plano.',
      '2. Formulário de Venda — Preencha dados do titular, dependentes e valor.',
      '3. Documentos — Anexe os documentos obrigatórios (variam por modalidade).',
      '4. Revisão — Confira e finalize.',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Evolução CRM',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse Comercial → aba Evolução.',
      'Visualize gráficos de atividades e faturamento por semana.',
      'Filtre por período: últimos 30, 60 ou 90 dias.',
      'KPIs resumidos mostram ligações, cotações, conversão e faturamento.',
      'A barra de progresso da meta é atualizada automaticamente.',
    ],
  },
  {
    icon: Kanban,
    title: 'CRM (Kanban)',
    access: 'all',
    tabKey: 'crm',
    content: [
      'Visualize todos os leads em um quadro Kanban com colunas personalizáveis.',
      'Arraste os cards entre colunas para atualizar o estágio do lead.',
      'Crie novos leads clicando no botão "+" dentro de qualquer coluna.',
      'Para editar ou excluir um lead, envie uma solicitação ao administrador com justificativa.',
      'Administradores podem adicionar, renomear e reordenar colunas livremente.',
    ],
  },
  {
    icon: FileText,
    title: 'Documentos por Modalidade',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Os documentos obrigatórios e opcionais são definidos pelo Inventário (Modalidades).',
      'Pessoa Física: Doc com foto, comprovante de endereço.',
      'Familiar: Docs de todos os membros. Cônjuges precisam de certidão de casamento.',
      'PME Multi: Docs individuais + CNPJ da empresa.',
      'Empresarial (10+): Docs individuais + CNPJ + comprovação de vínculo (FGTS/eSocial/CTPS).',
      'Com plano anterior: Carteirinha, carta de permanência (PDF), 3 boletos.',
    ],
  },
  {
    icon: Bell,
    title: 'Notificações',
    access: 'all',
    tabKey: 'notificacoes',
    content: [
      'Notificações são exibidas como uma caixa de entrada com abas "Não Lidas" e "Lidas".',
      'Marque como lida/não lida ou exclua notificações individualmente.',
      'O sino na barra lateral mostra a contagem de não lidas em tempo real.',
      'Administradores podem configurar a exclusão automática de notificações lidas.',
    ],
  },
  {
    icon: Flag,
    title: 'Minhas Ações',
    access: 'all',
    tabKey: 'minhas-acoes',
    content: [
      'Acompanhe seus registros de atividades e vendas.',
      'Filtre por status, data e busca textual.',
      'Registros com status "Pendente" ou "Devolvido" podem ser editados ou excluídos.',
      'Registros aprovados ficam bloqueados para manter a integridade.',
    ],
  },
  {
    icon: Trophy,
    title: 'Sistema de Gamificação',
    access: 'all',
    tabKey: 'progresso',
    content: [
      '💎 Diamante (≥200%): Desempenho lendário!',
      '🔘 Platina (≥150%): Superou expectativas.',
      '🥇 Ouro (≥100%): Meta batida!',
      '🥈 Prata (90-99%): Muito perto!',
      '🥉 Bronze (80-89%): Continue acelerando.',
      'Gestores visualizam flags de risco: 🟡 Amarelo, 🟠 Laranja, 🔴 Vermelho.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Painel de Gestão',
    access: 'supervisor_up',
    tabKey: 'gestao',
    content: [
      'Visível para supervisores, gerentes e administradores.',
      'Filtros avançados por período (semana, mês, trimestre, 30/60/90 dias) e consultor.',
      'Abas: Comparativo (gráficos por consultor), Evolução (tendência semanal), Ranking (patentes e flags).',
      'Kanban de vendas com busca e filtro por status.',
      'Todos os KPIs são recalculados automaticamente ao mudar o filtro.',
    ],
  },
  {
    icon: Package,
    title: 'Inventário',
    access: 'all',
    tabKey: 'inventario',
    content: [
      'Gerencie Companhias, Produtos, Modalidades e Leads.',
      'Modalidades definem documentos obrigatórios/opcionais e quantidade de vidas.',
      'Leads são classificados automaticamente como PF ou Empresa com base na modalidade.',
      'Os dados do inventário alimentam dinamicamente o formulário de vendas.',
    ],
  },
  {
    icon: UserCircle,
    title: 'Meu Perfil',
    access: 'all',
    content: [
      'Visualize seus dados pessoais, cargo e líderes.',
      'A edição de perfil é feita exclusivamente pelo administrador.',
      'Diretores e gerentes podem habilitar/desabilitar guias de atividades e ações.',
    ],
  },
  {
    icon: Shield,
    title: 'Segurança',
    access: 'all',
    content: [
      'O login é feito exclusivamente com conta Google.',
      'Somente usuários pré-cadastrados ou com solicitação aprovada têm acesso.',
      'O formulário de solicitação permite indicar supervisor e gerente.',
    ],
  },
];

export function HelpGuide({ open, onOpenChange }: HelpGuideProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: role } = useUserRole();
  const { data: tabPerms = [] } = useMyTabPermissions();

  const isAdmin = role === 'administrador';
  const isSupervisorUp = role === 'supervisor' || role === 'gerente' || isAdmin;

  const visibleSections = sections.filter(s => {
    // Role-based access
    if (s.access === 'supervisor_up' && !isSupervisorUp) return false;
    if (s.access === 'admin' && !isAdmin) return false;
    // Tab permission-based: admins see all
    if (!isAdmin && s.tabKey) {
      if (!isTabEnabled(tabPerms, s.tabKey)) return false;
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Guia do Usuário
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-6 pb-6">
          <div className="space-y-1 mt-4">
            {visibleSections.map((section, i) => (
              <div key={i}>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <section.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-foreground">{section.title}</span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === i ? 'rotate-90' : ''}`} />
                </button>
                {expanded === i && (
                  <div className="pl-14 pr-4 pb-3 space-y-2 animate-fade-in">
                    {section.content.map((line, j) => (
                      <p key={j} className="text-xs text-muted-foreground leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {i < visibleSections.length - 1 && <Separator className="bg-border/15" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
