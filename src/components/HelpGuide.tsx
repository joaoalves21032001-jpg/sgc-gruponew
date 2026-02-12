import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, LayoutDashboard, Briefcase, BarChart3, UserCircle,
  ClipboardList, ShoppingCart, FileText, Shield, ChevronRight
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
      'O Dashboard exibe um resumo das suas atividades e vendas.',
      'Os cards mostram KPIs como ligações, cotações e vendas do mês.',
      'Os gráficos apresentam seu desempenho ao longo do tempo.',
      'A patente é atualizada automaticamente com base no % da meta atingida.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Registrar Atividades',
    content: [
      'Acesse Comercial → aba Atividades.',
      'Preencha TODOS os campos numéricos (mesmo que seja 0).',
      'As taxas de conversão são calculadas automaticamente.',
      'Clique no botão REGISTRAR ATIVIDADES (barra verde no topo ou botão azul no final).',
      'Um resumo será exibido para confirmação antes do envio.',
      'O supervisor e gerente receberão notificação automática.',
      'Para lançamento retroativo, é obrigatória uma justificativa.',
      'Também é possível importar atividades em massa via arquivo CSV.',
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Registrar Venda',
    content: [
      'Acesse Comercial → aba Nova Venda.',
      'Siga o wizard de 5 etapas:',
      '1. Modalidade — Selecione o tipo de plano (PF, Familiar, PME, Empresarial).',
      '2. Dados do Titular — Preencha nome, e-mail, telefone, endereço e valor do contrato.',
      '3. Beneficiários — Adicione as vidas com nome, e-mail e telefone individuais.',
      '4. Documentos — Anexe os documentos obrigatórios para o titular e cada beneficiário.',
      '5. Revisão — Confira todos os dados e finalize.',
      'Documentos obrigatórios variam por modalidade. Os marcados com * são obrigatórios.',
    ],
  },
  {
    icon: FileText,
    title: 'Documentos por Modalidade',
    content: [
      'Pessoa Física: Doc com foto, comprovante de endereço, e-mail, telefone.',
      'Familiar: Todos os membros devem enviar docs. Cônjuges precisam de certidão de casamento.',
      'PME (1 vida): Doc com foto, CNPJ, comprovante de endereço, e-mail, telefone.',
      'PME (multi vidas): Todos devem enviar docs individuais + CNPJ.',
      'Empresarial (10+): Docs individuais + CNPJ + comprovação de vínculo (FGTS/eSocial/CTPS).',
      'Com plano anterior: Carteirinha, carta de permanência (PDF), 3 boletos e 3 comprovantes (opcionais).',
    ],
  },
  {
    icon: BarChart3,
    title: 'Gestão (Supervisores/Gerentes)',
    content: [
      'Visível apenas para supervisores, gerentes e administradores.',
      'Kanban de vendas com drag-and-drop para alterar status.',
      'Ranking de consultores por meta atingida.',
      'Gráficos comparativos de equipe.',
    ],
  },
  {
    icon: UserCircle,
    title: 'Meu Perfil',
    content: [
      'Visualize seus dados pessoais, cargo e hierarquia.',
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
      'Após esse período, o MFA será solicitado novamente.',
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
