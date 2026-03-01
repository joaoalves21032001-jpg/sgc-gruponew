import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, LayoutDashboard, Briefcase, BarChart3, UserCircle,
  ClipboardList, ShoppingCart, FileText, Shield, ChevronRight, Upload, Flag, Trophy,
  TrendingUp, Package, Bell, Kanban, CheckSquare, Users, UserCog, Activity
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
  /* ═══════════════════════════════════════════
   *  MEU PROGRESSO (tabKey: progresso)
   * ═══════════════════════════════════════════ */
  {
    icon: LayoutDashboard,
    title: 'Meu Progresso',
    access: 'all',
    tabKey: 'progresso',
    content: [
      'Painel pessoal com resumo do seu desempenho no mês atual.',
      'Cards de KPI mostram: Ligações, Mensagens, Cotações Enviadas, Cotações Fechadas, Follow-up, Faturamento, Meta e Vidas.',
      'Cada card exibe a variação percentual em relação ao período anterior (↑ verde = cresceu, ↓ vermelho = caiu).',
      'O sistema de Patentes classifica você automaticamente pelo % da meta atingida:',
      '🥉 Bronze (80–89%) · 🥈 Prata (90–99%) · 🥇 Ouro (100%+) · 🔘 Platina (150%+) · 💎 Diamante (200%+).',
      'Se a meta estiver abaixo de 80%, uma frase motivacional personalizada aparecerá para você.',
      'Ao atingir 100% da meta, uma animação de confetes é disparada automaticamente. 🎉',
    ],
  },

  /* ═══════════════════════════════════════════
   *  REGISTRO DE ATIVIDADES (tabKey: comercial)
   * ═══════════════════════════════════════════ */
  {
    icon: ClipboardList,
    title: 'Registro de Atividades',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse a guia "Registro de Atividades" na sidebar para registrar seu dia de trabalho.',
      'Aba "Atividades": preencha os campos numéricos — Ligações, Mensagens, Cotações Enviadas, Cotações Respondidas, Cotações Não Respondidas e Follow-up.',
      'Todos os campos devem ser preenchidos (coloque 0 nos que não se aplicam).',
      'As taxas de conversão (respondida, não respondida) são calculadas automaticamente em tempo real.',
      'Selecione a data do registro. Para datas passadas (retroativas), é obrigatório informar uma justificativa.',
      'Registros retroativos geram notificação automática ao seu Supervisor e Gerente.',
      'Após salvar, o registro fica com status "Pendente" e segue para aprovação.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  IMPORTAR VIA CSV (tabKey: comercial)
   * ═══════════════════════════════════════════ */
  {
    icon: Upload,
    title: 'Importar Atividades via CSV',
    access: 'all',
    tabKey: 'comercial',
    content: [
      '1. Clique em "Modelo" para baixar a planilha padrão com o formato correto.',
      '2. Preencha cada linha: data no formato dd/mm/aaaa e valores numéricos inteiros.',
      '3. Exemplo: 12/02/2026;15;20;8;6;4;2',
      '4. Separe as colunas com ponto e vírgula (;) ou vírgula (,).',
      '5. Salve o arquivo como CSV com codificação UTF-8.',
      '6. Clique em "Upload" e selecione o arquivo.',
      '7. O sistema exibirá um resumo para conferência antes da confirmação.',
      '8. Datas retroativas exigirão justificativa individual para cada dia importado.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  NOVA VENDA / WIZARD (tabKey: comercial)
   * ═══════════════════════════════════════════ */
  {
    icon: ShoppingCart,
    title: 'Registrar Nova Venda',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse "Registro de Atividades" → aba "Nova Venda".',
      'O formulário segue um Wizard de 4 etapas:',
      'Etapa 1 — Modalidade: selecione o tipo de plano (PF, Familiar, PME Multi, Empresarial, Adesão, etc.).',
      'Etapa 2 — Formulário: preencha dados do titular, dependentes, companhia, produto, valor, co-participação, vigência e observações.',
      'Etapa 3 — Documentos: anexe os documentos obrigatórios que variam conforme a modalidade selecionada.',
      'Etapa 4 — Revisão: confira todos os dados e finalize o envio.',
      'Vendas com data retroativa exigem justificativa. Após enviar, o status fica "Em Análise".',
      'O campo "Nome do Responsável" puxa dados dos Leads cadastrados no Inventário.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  EVOLUÇÃO CRM (tabKey: comercial)
   * ═══════════════════════════════════════════ */
  {
    icon: TrendingUp,
    title: 'Evolução CRM',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Acesse "Registro de Atividades" → aba "Evolução".',
      'Visualize gráficos de área com a tendência de atividades (ligações, cotações) por semana.',
      'Gráfico de faturamento semanal mostra sua receita aprovada ao longo do tempo.',
      'Filtros disponíveis: últimos 30, 60 ou 90 dias.',
      'KPIs resumidos: total de ligações, cotações, taxa de conversão e faturamento acumulado.',
      'A barra de progresso da meta é atualizada automaticamente conforme suas vendas são aprovadas.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  MINHAS AÇÕES (tabKey: minhas-acoes)
   * ═══════════════════════════════════════════ */
  {
    icon: ClipboardList,
    title: 'Minhas Ações',
    access: 'all',
    tabKey: 'minhas-acoes',
    content: [
      'Acompanhe todos os seus registros de atividades e vendas em um só lugar.',
      'Duas abas: "Atividades" e "Vendas", cada uma com lista de cards organizados.',
      'Filtros: busca textual, filtro por status (Pendente, Aprovado, Devolvido, Solicitado) e filtro por data.',
      'Status "Devolvido": você pode editar diretamente e reenviar para aprovação.',
      'Status "Pendente" ou "Aprovado": para alterar, clique em "Solicitar Alteração" e informe a justificativa com as mudanças desejadas.',
      'Registros com status "Devolvido" ou "Pendente" podem ser excluídos.',
      'Registros aprovados ficam bloqueados para preservar a integridade dos dados.',
      'O badge na sidebar mostra quantas ações precisam de sua atenção.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  CRM — KANBAN (tabKey: crm)
   * ═══════════════════════════════════════════ */
  {
    icon: Kanban,
    title: 'CRM (Kanban de Leads)',
    access: 'all',
    tabKey: 'crm',
    content: [
      'Quadro Kanban com colunas que representam os estágios do funil de vendas (ex: Primeiro Contato, Sem Contato, Envio de Cotação, Negociação, etc.).',
      'Arraste os cards entre colunas para atualizar o estágio de cada lead.',
      'Clique em "+ Novo Lead" (topo ou rodapé da coluna) para cadastrar um novo lead com dados completos: tipo, nome, contato, e-mail, documentos, companhia, produto, titulares e dependentes.',
      'Para editar/excluir seus próprios leads, use o menu ⋯ no card.',
      'Para editar leads de outros consultores, envie uma solicitação com justificativa.',
      'Leads marcados como "Livre" ficam visíveis para toda a equipe e podem ser assumidos por outros consultores.',
      'Regras de movimentação: mover para "Envio de Cotação" exige cotação (PDF) anexada; estágios avançados exigem contato/e-mail e documentos preenchidos.',
      'Ao arrastar para "Venda Realizada", o sistema dispara confetes e redireciona para o formulário de venda com dados pré-preenchidos.',
      'Campos adicionais no lead: aproveitamento de carência (carteirinha anterior + carta de permanência), venda dental, co-participação, estagiários e data de vigência.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  NOTIFICAÇÕES (tabKey: notificacoes)
   * ═══════════════════════════════════════════ */
  {
    icon: Bell,
    title: 'Notificações',
    access: 'all',
    tabKey: 'notificacoes',
    content: [
      'Central de notificações com duas abas: "Não Lidas" e "Lidas".',
      'Cada notificação exibe título, mensagem, data e um link de ação (quando disponível).',
      'Clique em uma notificação para marcá-la como lida e ser redirecionado à página correspondente.',
      'Ações disponíveis: marcar como lida/não lida e excluir individualmente.',
      'Botão "Marcar Todas como Lidas" permite limpar todas as não lidas de uma vez.',
      'O sino na sidebar exibe a contagem de notificações não lidas em tempo real.',
      'Administradores podem acessar as configurações (ícone ⚙️) para habilitar a exclusão automática de notificações lidas após um período.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  DOCUMENTOS POR MODALIDADE (tabKey: comercial)
   * ═══════════════════════════════════════════ */
  {
    icon: FileText,
    title: 'Documentos por Modalidade',
    access: 'all',
    tabKey: 'comercial',
    content: [
      'Os documentos exigidos em cada venda variam de acordo com a Modalidade selecionada.',
      'Pessoa Física (PF): documento com foto e comprovante de endereço.',
      'Familiar: documentos de todos os membros; cônjuges precisam de certidão de casamento.',
      'PME Multi: documentos individuais + Cartão CNPJ da empresa.',
      'Empresarial (10+ vidas): documentos individuais + CNPJ + comprovação de vínculo (FGTS/eSocial/CTPS).',
      'Com plano anterior (aproveitamento de carência): carteirinha anterior, carta de permanência (PDF) e 3 últimos boletos.',
      'No CRM, cotações (PDF) podem ser anexadas diretamente ao lead.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  EQUIPE (tabKey: equipe)
   * ═══════════════════════════════════════════ */
  {
    icon: Users,
    title: 'Equipe',
    access: 'all',
    tabKey: 'equipe',
    content: [
      'Visualize a árvore hierárquica da sua equipe com a estrutura completa de liderança.',
      'Cada membro exibe: nome, cargo, e-mail, telefone, data de admissão, tempo de empresa e aniversário.',
      'Clique em um membro para expandir e ver seu perfil completo, vendas e premiações.',
      'KPIs individuais: faturamento aprovado e total de vidas vendidas no período.',
      'Administradores podem adicionar premiações (troféus) aos membros da equipe.',
      'Use a barra de busca para localizar membros rapidamente por nome.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  APROVAÇÕES (tabKey: aprovacoes) — supervisor_up
   * ═══════════════════════════════════════════ */
  {
    icon: CheckSquare,
    title: 'Aprovações',
    access: 'supervisor_up',
    tabKey: 'aprovacoes',
    content: [
      'Central unificada para gestão de aprovações. Disponível para Supervisores, Gerentes e Administradores.',
      'Cinco sub-abas com contadores de pendências:',
      '① Vendas — visualize detalhes completos (titular, modalidade, valor, documentos) e aprove ou devolva com justificativa obrigatória.',
      '② Atividades — revise registros de atividades dos consultores e aprove ou devolva.',
      '③ Cotações — cotações vindas da landing page: aprove (cria lead no CRM), rejeite ou edite dados antes de aprovar.',
      '④ Acesso — solicitações de novos usuários: visualize dados completos, edite, aprove (cria conta automaticamente com código GN) ou rejeite com motivo.',
      '⑤ Solicitações — pedidos de alteração enviados por consultores: aprove (aplica as mudanças e recoloca na fila) ou rejeite.',
      'Filtros avançados disponíveis: busca, status, consultor e data.',
      'Aprovações e devoluções geram notificações automáticas ao consultor.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  DASHBOARD / GESTÃO (tabKey: gestao) — supervisor_up
   * ═══════════════════════════════════════════ */
  {
    icon: BarChart3,
    title: 'Dashboard (Painel de Gestão)',
    access: 'supervisor_up',
    tabKey: 'gestao',
    content: [
      'Painel analítico completo para supervisores, gerentes e administradores.',
      'Filtros globais: período (dia, semana, mês, trimestre, 30/60/90 dias), consultor individual e status.',
      'KPIs da equipe: consultores ativos, faturamento vs meta, total de vidas, alertas de risco e taxa de conversão.',
      'Sete abas de análise:',
      '① Comparativo — gráficos de barras: faturamento vs meta e conversão por consultor.',
      '② Evolução — gráficos de área: atividades e faturamento por semana.',
      '③ Ranking — lista ordenada de consultores com patentes, flags de risco (🟡🟠🔴) e % da meta.',
      '④ Tempo Real — consultores ativos e feed cronológico de ações recentes.',
      '⑤ Exploração — tabela dinâmica pivotada por consultor ou modalidade.',
      '⑥ Monetização — receita por período, ticket médio por venda e por vida.',
      '⑦ Comparar — sobreposição de gráficos de dois consultores lado a lado.',
      'Kanban de Vendas na parte inferior com busca e filtro por status.',
      'Consultores com acesso ao Dashboard via permissão de guia veem apenas seus próprios dados.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  INVENTÁRIO (tabKey: inventario) — supervisor_up
   * ═══════════════════════════════════════════ */
  {
    icon: Package,
    title: 'Inventário',
    access: 'supervisor_up',
    tabKey: 'inventario',
    content: [
      'Central de cadastro dos dados que alimentam o formulário de vendas e o CRM.',
      'Três abas:',
      '① Companhias — cadastre operadoras/seguradoras com nome, CNPJ e logotipo.',
      '② Produtos — cadastre planos vinculados a uma companhia (nome + companhia).',
      '③ Modalidades — defina tipos de plano (PF, Familiar, PME, Empresarial, Adesão) com documentos obrigatórios e opcionais, e faixa de quantidade de vidas.',
      'Cada item pode ser criado, editado ou excluído (com confirmação).',
      'Os dados do inventário são carregados dinamicamente nos selects do formulário de venda e no CRM.',
      'Use a barra de busca para localizar itens rapidamente.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  USUÁRIOS (admin only)
   * ═══════════════════════════════════════════ */
  {
    icon: UserCog,
    title: 'Usuários',
    access: 'admin',
    content: [
      'Gestão completa de usuários do sistema. Exclusivo para administradores.',
      'Lista todos os perfis com nome, apelido, e-mail, código GN, cargo e status.',
      'Ao editar um usuário, você pode definir: dados pessoais, cargo, supervisor, gerente, meta de faturamento, data de admissão, data de nascimento e avatar.',
      'O painel de "Permissões de Guias" permite habilitar/desabilitar guias individualmente para cada usuário (ex: progresso, comercial, CRM, notificações, etc.).',
      'Botão "Desabilitar" bloqueia o acesso do usuário ao sistema sem excluí-lo.',
      'Novos usuários podem ser cadastrados manualmente com geração automática do código GN.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  LOGS DE AUDITORIA (supervisor_up)
   * ═══════════════════════════════════════════ */
  {
    icon: Activity,
    title: 'Logs de Auditoria',
    access: 'supervisor_up',
    content: [
      'Registro completo de todas as ações realizadas no sistema.',
      'Cada log exibe: ação, tipo de entidade, ID do registro, usuário, data/hora e detalhes em JSON.',
      'Ações rastreadas incluem: login, criar/editar/excluir atividades, vendas, leads, companhias, produtos, modalidades, aprovar/devolver registros, solicitar alterações e mais.',
      'Filtros: busca textual, filtro por tipo de ação e filtro por usuário.',
      'Útil para rastreabilidade e auditoria de compliance.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  MEU PERFIL (sem tabKey — sempre visível)
   * ═══════════════════════════════════════════ */
  {
    icon: UserCircle,
    title: 'Meu Perfil',
    access: 'all',
    content: [
      'Visualize seus dados pessoais: nome, apelido, e-mail, telefone, CPF, RG, endereço, cargo, código GN e líderes (supervisor e gerente).',
      'Informações complementares: data de admissão, tempo de empresa, data de nascimento e contatos de emergência.',
      'Clique no ícone de câmera no avatar para alterar sua foto de perfil.',
      'Para solicitar alteração de dados pessoais, clique em "Solicitar Alteração de Dados" e descreva as mudanças desejadas. A solicitação será enviada ao administrador.',
      'A edição direta de dados (exceto avatar) é feita exclusivamente pelo administrador na guia Usuários.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  SISTEMA DE GAMIFICAÇÃO (supervisor_up)
   * ═══════════════════════════════════════════ */
  {
    icon: Trophy,
    title: 'Sistema de Gamificação',
    access: 'supervisor_up',
    tabKey: 'progresso',
    content: [
      'O sistema de patentes classifica automaticamente cada consultor com base no percentual de meta atingida:',
      '💎 Diamante (≥200%) — Desempenho lendário!',
      '🔘 Platina (≥150%) — Superou todas as expectativas.',
      '🥇 Ouro (≥100%) — Meta batida!',
      '🥈 Prata (90–99%) — Muito perto da meta.',
      '🥉 Bronze (80–89%) — Continue acelerando.',
      'Gestores visualizam flags de risco no Dashboard e Ranking:',
      '🟡 Amarelo — atenção, desempenho caindo.',
      '🟠 Laranja — risco moderado.',
      '🔴 Vermelho — situação crítica, requer intervenção.',
    ],
  },

  /* ═══════════════════════════════════════════
   *  SEGURANÇA (sem tabKey — sempre visível)
   * ═══════════════════════════════════════════ */
  {
    icon: Shield,
    title: 'Segurança e Acesso',
    access: 'all',
    content: [
      'O login é realizado exclusivamente com conta Google (autenticação OAuth).',
      'Somente usuários pré-cadastrados ou com solicitação de acesso aprovada podem entrar no sistema.',
      'Novos colaboradores podem preencher o formulário de solicitação de acesso na tela de login, informando dados completos, supervisor e gerente desejados.',
      'Após a aprovação por um supervisor/gerente, a conta é criada automaticamente e o novo usuário recebe notificação.',
      'Guias podem ser habilitadas/desabilitadas individualmente pelo administrador, controlando quais seções do sistema cada usuário pode acessar.',
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
