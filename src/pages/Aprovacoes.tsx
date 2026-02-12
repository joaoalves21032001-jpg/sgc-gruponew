import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useTeamVendas, useUpdateVendaStatus, type Venda } from '@/hooks/useVendas';
import { useTeamAtividades, type Atividade } from '@/hooks/useAtividades';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Shield, Search, CheckCircle2, XCircle, Clock, Pencil, Undo2,
  ClipboardList, ShoppingCart, Users, CalendarIcon, Eye
} from 'lucide-react';

const statusColors: Record<string, string> = {
  analise: 'bg-primary/10 text-primary border-primary/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  recusado: 'bg-destructive/10 text-destructive border-destructive/20',
};

const Aprovacoes = () => {
  const { data: role } = useUserRole();
  const { data: profiles = [] } = useTeamProfiles();
  const { data: vendas = [], isLoading } = useTeamVendas();
  const { data: atividades = [] } = useTeamAtividades();
  const updateStatus = useUpdateVendaStatus();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterConsultor, setFilterConsultor] = useState('todos');
  const [filterDate, setFilterDate] = useState('');
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [obs, setObs] = useState('');

  const isSupervisorUp = role === 'supervisor' || role === 'gerente' || role === 'administrador';

  if (!isSupervisorUp) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Disponível para Supervisores, Gerentes e Diretores.</p>
        </div>
      </div>
    );
  }

  const getConsultorName = (userId: string) => {
    const p = profiles.find(c => c.id === userId);
    return p?.apelido || p?.nome_completo?.split(' ')[0] || '—';
  };

  const filteredVendas = vendas.filter(v => {
    const matchesSearch = !search || v.nome_titular.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || v.status === filterStatus;
    const matchesConsultor = filterConsultor === 'todos' || v.user_id === filterConsultor;
    const matchesDate = !filterDate || v.created_at.startsWith(filterDate);
    return matchesSearch && matchesStatus && matchesConsultor && matchesDate;
  });

  const pendingCount = vendas.filter(v => v.status === 'analise' || v.status === 'pendente').length;

  const handleAction = async (venda: Venda, action: 'aprovado' | 'recusado' | 'pendente') => {
    try {
      await updateStatus.mutateAsync({ id: venda.id, status: action, observacoes: obs });
      const label = action === 'aprovado' ? 'aprovada' : action === 'recusado' ? 'recusada' : 'devolvida';
      toast.success(`Venda ${label} com sucesso!`);
      setSelectedVenda(null);
      setObs('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Aprovações</h1>
          <p className="text-sm text-muted-foreground mt-1">Aprove, recuse ou devolva registros da sua equipe</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por titular..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
        </div>
        <Select value={filterConsultor} onValueChange={setFilterConsultor}>
          <SelectTrigger className="w-[160px] h-10 border-border/40"><Users className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.apelido || p.nome_completo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-10 border-border/40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="analise">Em Análise</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 w-[160px] bg-card border-border/40" />
      </div>

      {/* Vendas list */}
      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredVendas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhum registro encontrado.
          </div>
        ) : (
          filteredVendas.map((v) => {
            const sc = statusColors[v.status] || statusColors.analise;
            return (
              <div key={v.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 hover:shadow-card-hover transition-all cursor-pointer" onClick={() => { setSelectedVenda(v); setObs(v.observacoes || ''); }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{v.nome_titular}</p>
                      <Badge variant="outline" className={`text-[10px] ${sc}`}>{v.status === 'analise' ? 'Em Análise' : v.status === 'pendente' ? 'Pendente' : v.status === 'aprovado' ? 'Aprovado' : 'Recusado'}</Badge>
                      <Badge variant="outline" className="text-[10px]">{v.modalidade}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{getConsultorName(v.user_id)}</span>
                      <span>•</span>
                      <span>{v.vidas} vida(s)</span>
                      {v.valor && <><span>•</span><span>R$ {v.valor.toLocaleString('pt-BR')}</span></>}
                      <span>•</span>
                      <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedVenda} onOpenChange={() => setSelectedVenda(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedVenda && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Titular</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.nome_titular}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Modalidade</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.modalidade}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Consultor</span><p className="font-semibold text-foreground mt-0.5">{getConsultorName(selectedVenda.user_id)}</p></div>
                <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Vidas</span><p className="font-semibold text-foreground mt-0.5">{selectedVenda.vidas}</p></div>
                {selectedVenda.valor && <div><span className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Valor</span><p className="font-semibold text-foreground mt-0.5">R$ {selectedVenda.valor.toLocaleString('pt-BR')}</p></div>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Observações</label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo da ação..." rows={3} className="border-border/40" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => handleAction(selectedVenda, 'aprovado')} className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-semibold">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button onClick={() => handleAction(selectedVenda, 'recusado')} variant="destructive" className="flex-1 font-semibold">
                  <XCircle className="w-4 h-4 mr-1" /> Recusar
                </Button>
                <Button onClick={() => handleAction(selectedVenda, 'pendente')} variant="outline" className="flex-1 font-semibold">
                  <Undo2 className="w-4 h-4 mr-1" /> Devolver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aprovacoes;
