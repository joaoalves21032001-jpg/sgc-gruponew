import { useState } from 'react';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useAuditLogs, type AuditLog } from '@/hooks/useAuditLog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Activity, User, Calendar, Filter, FileText } from 'lucide-react';

const actionLabels: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  criar_atividade: 'Criar Atividade',
  editar_atividade: 'Editar Atividade',
  excluir_atividade: 'Excluir Atividade',
  aprovar_atividade: 'Aprovar Atividade',
  devolver_atividade: 'Devolver Atividade',
  criar_venda: 'Criar Venda',
  editar_venda: 'Editar Venda',
  excluir_venda: 'Excluir Venda',
  aprovar_venda: 'Aprovar Venda',
  devolver_venda: 'Devolver Venda',
  criar_lead: 'Criar Lead',
  editar_lead: 'Editar Lead',
  excluir_lead: 'Excluir Lead',
  mover_lead: 'Mover Lead',
  solicitar_edicao_lead: 'Solicitar Edição Lead',
  solicitar_exclusao_lead: 'Solicitar Exclusão Lead',
  aprovar_acesso: 'Aprovar Acesso',
  rejeitar_acesso: 'Rejeitar Acesso',
  criar_usuario: 'Criar Usuário',
  editar_usuario: 'Editar Usuário',
  excluir_usuario: 'Excluir Usuário',
  desabilitar_usuario: 'Desabilitar Usuário',
  reativar_usuario: 'Reativar Usuário',
  criar_companhia: 'Criar Companhia',
  editar_companhia: 'Editar Companhia',
  excluir_companhia: 'Excluir Companhia',
  criar_produto: 'Criar Produto',
  editar_produto: 'Editar Produto',
  excluir_produto: 'Excluir Produto',
  criar_modalidade: 'Criar Modalidade',
  editar_modalidade: 'Editar Modalidade',
  excluir_modalidade: 'Excluir Modalidade',
  solicitar_alteracao: 'Solicitar Alteração',
  alterar_avatar: 'Alterar Avatar',
};

const entityTypeLabels: Record<string, string> = {
  atividade: 'Atividade',
  venda: 'Venda',
  lead: 'Lead',
  profile: 'Usuário',
  access_request: 'Solicitação de Acesso',
  correction_request: 'Solicitação de Correção',
  companhia: 'Companhia',
  produto: 'Produto',
  modalidade: 'Modalidade',
};

const actionColors: Record<string, string> = {
  criar: 'bg-success/10 text-success border-success/20',
  editar: 'bg-primary/10 text-primary border-primary/20',
  excluir: 'bg-destructive/10 text-destructive border-destructive/20',
  aprovar: 'bg-success/10 text-success border-success/20',
  devolver: 'bg-warning/10 text-warning border-warning/20',
  rejeitar: 'bg-destructive/10 text-destructive border-destructive/20',
  login: 'bg-primary/10 text-primary border-primary/20',
  logout: 'bg-muted text-muted-foreground border-border/30',
  solicitar: 'bg-warning/10 text-warning border-warning/20',
  desabilitar: 'bg-destructive/10 text-destructive border-destructive/20',
  reativar: 'bg-success/10 text-success border-success/20',
};

function getActionColor(action: string) {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.includes(key)) return color;
  }
  return 'bg-muted text-muted-foreground border-border/30';
}

const AuditLogs = () => {
  const { data: role } = useUserRole();
  const { data: profiles = [] } = useTeamProfiles();
  const [filterUser, setFilterUser] = useState('todos');
  const [filterAction, setFilterAction] = useState('todos');
  const [filterEntity, setFilterEntity] = useState('todos');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useAuditLogs({
    userId: filterUser,
    action: filterAction,
    entityType: filterEntity,
    startDate: filterStartDate,
    endDate: filterEndDate,
  });

  if (role !== 'administrador') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Somente administradores podem acessar os logs.</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (l.user_name || '').toLowerCase().includes(s) ||
      l.action.toLowerCase().includes(s) ||
      (l.entity_type || '').toLowerCase().includes(s) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(s)
    );
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Monitoramento de Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Auditoria completa de todas as ações do sistema — retenção de 1 ano</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border/30 shadow-card space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar nos logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-background border-border/40" />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="h-10 border-border/40"><User className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Usuários</SelectItem>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.apelido || p.nome_completo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-10 border-border/40"><Activity className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Ações</SelectItem>
              {uniqueActions.map(a => <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="h-10 bg-background border-border/40" placeholder="Data início" />
          <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="h-10 bg-background border-border/40" placeholder="Data fim" />
        </div>
      </div>

      {/* Results */}
      <div className="text-xs text-muted-foreground">{filteredLogs.length} registro(s) encontrado(s)</div>
      
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhum log encontrado.
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{log.user_name || 'Sistema'}</span>
                    <Badge variant="outline" className={`text-[10px] ${getActionColor(log.action)}`}>
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    {log.entity_type && (
                      <Badge variant="outline" className="text-[10px] bg-muted/40">
                        <FileText className="w-2.5 h-2.5 mr-0.5" />
                        {entityTypeLabels[log.entity_type] || log.entity_type}
                      </Badge>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                  {log.entity_id && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                      ID: {log.entity_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground/60">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
