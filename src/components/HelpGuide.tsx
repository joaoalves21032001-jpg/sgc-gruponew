import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, LayoutDashboard, Briefcase, BarChart3, UserCircle,
  ClipboardList, ShoppingCart, FileText, Shield, ChevronRight, Upload, Flag, Trophy
} from 'lucide-react';

interface HelpGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
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
    content: [
      '1. Clique em "Modelo" para baixar a planilha padrão.',
      '2. Preencha seguindo o formato: dd/mm/aaaa para datas, valores numéricos inteiros.',
      '3. Exemplo de linha: 12/02/2026;15;20;8;6;4;2;3',
      '4. Separe as colunas com ponto e vírgula (;) ou vírgula (,).',
      '5. Salve o arquivo como CSV (UTF-8).',
      '6. Clique em "Upload" e selecione o arquivo.',
      '7. Um resumo será exibido para conferência antes de confirmar.',
      '8. Datas retroativas exigirão justificativa individual para cada dia.',
      'Colunas: Data, Ligações, Mensagens, Cotações Coletadas, Cotações Enviadas, Cotações Respondidas, Cotações Não Respondidas, Follow-up.',
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Registrar Venda',
    content: [
      'Acesse Comercial → aba Nova Venda.',
      'Siga o wizard de 5 etapas:',
      '1. Modalidade — Selecione o tipo de plano.',
      '2. Dados do Titular — Preencha nome, e-mail, telefone, endereço e valor.',
      '3. Beneficiários — Adicione as vidas do plano.',
      '4. Documentos — Anexe os documentos obrigatórios.',
      '5. Revisão — Confira e finalize.',
    ],
  },
  {
    icon: Upload,
    title: 'Importar Vendas via CSV',
    content: [
      '1. Clique em "Modelo" na seção Importar vendas em massa.',
      '2. Preencha: Nome Titular;Modalidade;Vidas;Valor;Observações.',
      '3. Modalidades válidas: PF, Familiar, PME Multi, Empresarial, Adesão.',
      '4. Exemplo: João Silva;PF;1;1500;Observação opcional',
      '5. Após o upload, será exibido um resumo com todos os dados.',
      '6. Para cada venda, faça upload dos documentos obrigatórios antes de confirmar.',
      '7. Documentos variam por modalidade (Doc com foto, comprovante de endereço, CNPJ, etc.).',
    ],
  },
  {
    icon: FileText,
    title: 'Documentos por Modalidade',
    content: [
      'Pessoa Física: Doc com foto, comprovante de endereço.',
      'Familiar: Todos os membros devem enviar docs. Cônjuges precisam de certidão de casamento.',
      'PME (1 vida): Doc com foto, CNPJ, comprovante de endereço.',
      'PME (multi vidas): Todos devem enviar docs individuais + CNPJ.',
      'Empresarial (10+): Docs individuais + CNPJ + comprovação de vínculo (FGTS/eSocial/CTPS).',
      'Com plano anterior: Carteirinha, carta de permanência (PDF), 3 boletos e 3 comprovantes.',
    ],
  },
  {
    icon: Flag,
    title: 'Reportar Registro Indevido',
    content: [
      'Acesse Comercial → aba Atividades → seção "Reportar Registro Indevido".',
      'Selecione o tipo (atividade ou venda) e o registro específico.',
      'Descreva o motivo da correção necessária.',
      'O administrador será notificado e poderá editar ou excluir o registro.',
      'Acompanhe o status da solicitação na mesma página.',
    ],
  },
  {
    icon: Trophy,
    title: 'Sistema de Gamificação',
    content: [
      '💎 Diamante (≥200%): "Desempenho lendário! Você é a referência do time."',
      '🔘 Platina (≥150%): "Incrível! Você superou todas as expectativas."',
      '🥇 Ouro (≥100%): "Meta batida! Excelente trabalho, continue assim."',
      '🥈 Prata (90-99%): "Está muito perto! Faltam poucos detalhes."',
      '🥉 Bronze (80-89%): "Continue acelerando, o ouro é logo ali."',
      'Abaixo de 80%: "Foco total! Cada esforço conta." (sem alerta visual)',
      'Gestores também visualizam flags de risco: 🟡 Amarelo, 🟠 Laranja, 🔴 Vermelho.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Gestão (Administradores)',
    content: [
      'Visível apenas para administradores.',
      'Kanban de vendas com filtros por consultor, status e busca.',
      'Ranking de consultores por meta atingida com patentes e flags de risco.',
      'Gráficos comparativos de faturamento e conversão da equipe.',
    ],
  },
  {
    icon: UserCircle,
    title: 'Meu Perfil',
    content: [
      'Visualize seus dados pessoais, cargo e líderes.',
      'A edição de perfil é feita exclusivamente pelo administrador.',
      'Para alterações, solicite ao administrador do sistema.',
    ],
  },
  {
    icon: Shield,
    title: 'Segurança',
    content: [
      'O login é feito exclusivamente com conta Google.',
      'A autenticação em dois fatores (MFA) via Google Authenticator é obrigatória.',
      'Você pode marcar seu navegador como seguro por até 31 dias.',
    ],
  },
];

export function HelpGuide({ open, onOpenChange }: HelpGuideProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

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
            {sections.map((section, i) => (
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
                {i < sections.length - 1 && <Separator className="bg-border/15" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
