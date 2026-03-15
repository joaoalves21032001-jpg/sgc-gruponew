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
