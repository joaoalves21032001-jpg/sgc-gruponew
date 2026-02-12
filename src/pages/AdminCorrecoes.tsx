import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Search, Flag, Trash2, Pencil, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface CorrectionRequest {
  id: string;
  user_id: string;
  tipo: string;
  registro_id: string;
  motivo: string;
  status: string;
  admin_resposta: string | null;
  created_at: string;
  updated_at: string;
}

function useCorrections() {
  return useQuery({
    queryKey: ['correction-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('correction_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CorrectionRequest[];
    },
  });
}

function useUserNames(userIds: string[]) {
  return useQuery({
    queryKey: ['user-names', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .in('id', userIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.nome_completo; });
      return map;
    },
    enabled: userIds.length > 0,
  });
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const AdminCorrecoes = () => {
  const { data: role } = useUserRole();
  const { data: corrections, isLoading } = useCorrections();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<CorrectionRequest | null>(null);
  const [editStatus, setEditStatus] = useState('pendente');
  const [editResposta, setEditResposta] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CorrectionRequest | null>(null);

  const userIds = [...new Set(corrections?.map(c => c.user_id) ?? [])];
  const { data: userNames } = useUserNames(userIds);

  if (role !== 'administrador') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground">Somente administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  const filtered = corrections?.filter(c =>
    (userNames?.[c.user_id] || '').toLowerCase().includes(search.toLowerCase()) ||
    c.motivo.toLowerCase().includes(search.toLowerCase()) ||
    c.tipo.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleEdit = (item: CorrectionRequest) => {
    setEditItem(item);
    setEditStatus(item.status);
    setEditResposta(item.admin_resposta || '');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('correction_requests')
        .update({ status: editStatus, admin_resposta: editResposta.trim() || null } as any)
        .eq('id', editItem.id);
      if (error) throw error;

      // If status is resolvido and admin wants to delete the original record
      toast.success('Solicitação atualizada!');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      setEditItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (item: CorrectionRequest) => {
    setSaving(true);
    try {
      // Delete the original record
      const table = item.tipo === 'atividade' ? 'atividades' : 'vendas';
      const { error: delError } = await supabase.from(table).delete().eq('id', item.registro_id);
      if (delError) throw delError;

      // Update correction status
      await supabase
        .from('correction_requests')
        .update({ status: 'resolvido', admin_resposta: 'Registro excluído pelo administrador.' } as any)
        .eq('id', item.id);

      toast.success('Registro excluído e solicitação resolvida!');
      queryClient.invalidateQueries({ queryKey: ['correction-requests'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir registro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Solicitações de Correção</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as solicitações de correção enviadas pelos usuários</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por usuário, tipo ou motivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-card border-border/40"
        />
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          filtered.map((item) => {
            const sc = statusConfig[item.status] || statusConfig.pendente;
            const StatusIcon = sc.icon;
            return (
              <div key={item.id} className="bg-card rounded-xl border border-border/30 shadow-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{userNames?.[item.user_id] || 'Usuário'}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{item.tipo}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${sc.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleDateString('pt-BR')} — ID: {item.registro_id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(item)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                  <p className="text-sm text-foreground">{item.motivo}</p>
                </div>
                {item.admin_resposta && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Resposta do administrador:</p>
                    <p className="text-sm text-foreground">{item.admin_resposta}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Gerenciar Solicitação</DialogTitle>
            <DialogDescription>Atualize o status e adicione uma resposta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Resposta ao Usuário</label>
              <Textarea value={editResposta} onChange={(e) => setEditResposta(e.target.value)} placeholder="Descreva a ação tomada..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Registro Original</DialogTitle>
            <DialogDescription>
              Isso excluirá permanentemente o registro de {deleteConfirm?.tipo} reportado. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteRecord(deleteConfirm)} disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCorrecoes;
