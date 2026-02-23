import { useState, useMemo } from 'react';
import { useLeadStages, useMoveLeadToStage, type LeadStage } from '@/hooks/useLeadStages';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, type Lead } from '@/hooks/useInventario';
import { useModalidades } from '@/hooks/useInventario';
import { useUserRole, useProfile, useTeamProfiles } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, X, Upload, MoreHorizontal, Phone, Mail, Shield, User
} from 'lucide-react';
import { maskCPF, maskPhone } from '@/lib/masks';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/* ─── Lead Card ─── */
function LeadCard({ lead, isAdmin, onEdit, onDelete, onDragStart, leaderName }: {
  lead: Lead; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  leaderName?: string;
}) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className="bg-card rounded-lg border border-border/30 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-shadow group"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{lead.nome}</p>
          <Badge variant="outline" className="text-[9px] mt-1">{lead.tipo}</Badge>
          {(lead as any).livre && <Badge className="text-[9px] mt-1 bg-success/10 text-success border-success/20">Livre</Badge>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onEdit(lead)} className="text-xs gap-2"><Pencil className="w-3 h-3" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(lead)} className="text-xs gap-2 text-destructive"><Trash2 className="w-3 h-3" /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2 space-y-1">
        {lead.contato && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.contato}</p>}
        {lead.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{lead.email}</p>}
      </div>
      {(lead.doc_foto_path || lead.cartao_cnpj_path || lead.comprovante_endereco_path || lead.boletos_path) && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {lead.doc_foto_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Doc</span>}
          {lead.cartao_cnpj_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">CNPJ</span>}
          {lead.comprovante_endereco_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">Endereço</span>}
          {lead.boletos_path && <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Cotação</span>}
        </div>
      )}
      {leaderName && (
        <div className="mt-2 pt-1.5 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {leaderName}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumn({ stage, leads, isAdmin, onEdit, onDelete, onDragStart, onDrop, onAddLead, getLeaderName }: {
  stage: LeadStage; leads: Lead[]; isAdmin: boolean;
  onEdit: (l: Lead) => void; onDelete: (l: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (stageId: string) => void;
  onAddLead: (stageId: string) => void;
  getLeaderName: (createdBy: string | null) => string | undefined;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[320px] rounded-xl border transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border/30 bg-muted/20'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(stage.id); }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.cor }} />
        <span className="text-sm font-bold text-foreground flex-1 truncate">{stage.nome}</span>
        <Badge variant="outline" className="text-[10px] font-bold h-5 px-1.5">{leads.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
        {leads.map(l => (
          <LeadCard key={l.id} lead={l} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} leaderName={getLeaderName(l.created_by)} />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-6 text-muted-foreground/50 text-xs">Arraste leads para cá</div>
        )}
      </div>
      <button onClick={() => onAddLead(stage.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border/20">
        <Plus className="w-3.5 h-3.5" /> Novo lead
      </button>
    </div>
  );
}

/* ─── Main Kanban Board ─── */
export function KanbanBoard() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: profile } = useProfile();
  const { data: allProfiles = [] } = useTeamProfiles();
  const isAdmin = role === 'administrador';
  const { data: stages = [], isLoading: stagesLoading } = useLeadStages();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: modalidadesList = [] } = useModalidades();
  const createMut = useCreateLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const moveMut = useMoveLeadToStage();
  const logAction = useLogAction();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Lead form state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Lead | null>(null);
  const [formStageId, setFormStageId] = useState<string | null>(null);
  const defaultTipo = modalidadesList.length > 0 ? modalidadesList[0].nome : 'PF';
  const [form, setForm] = useState({ tipo: defaultTipo, nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '', peso: '', altura: '', livre: false });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Lead | null>(null);

  // Approval state for non-admins
  const [approvalDialog, setApprovalDialog] = useState<{ type: 'edit' | 'delete'; lead: Lead } | null>(null);
  const [approvalJustificativa, setApprovalJustificativa] = useState('');
  const [sendingApproval, setSendingApproval] = useState(false);

  // File uploads
  const [docFoto, setDocFoto] = useState<File | null>(null);
  const [cartaoCnpj, setCartaoCnpj] = useState<File | null>(null);
  const [comprovanteEndereco, setComprovanteEndereco] = useState<File | null>(null);
  const [cotacaoPdf, setCotacaoPdf] = useState<File | null>(null);

  const isPessoaFisica = (tipo: string) => tipo === 'PF' || tipo === 'Familiar' || tipo === 'pessoa_fisica';

  // Get leader name for a lead's creator
  const getLeaderName = (createdBy: string | null): string | undefined => {
    if (!createdBy) return undefined;
    const creator = allProfiles.find(p => p.id === createdBy);
    if (!creator) return undefined;
    // Show supervisor name, or gerente if no supervisor
    if (creator.supervisor_id) {
      const sup = allProfiles.find(p => p.id === creator.supervisor_id);
      return sup ? `Sup: ${sup.apelido || sup.nome_completo.split(' ')[0]}` : undefined;
    }
    if (creator.gerente_id) {
      const ger = allProfiles.find(p => p.id === creator.gerente_id);
      return ger ? `Ger: ${ger.apelido || ger.nome_completo.split(' ')[0]}` : undefined;
    }
    return undefined;
  };

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of stages) map[s.id] = [];
    const unassigned: Lead[] = [];
    for (const l of leads) {
      const sid = (l as any).stage_id;
      if (sid && map[sid]) map[sid].push(l);
      else unassigned.push(l);
    }
    return { map, unassigned };
  }, [stages, leads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Gatekeeper: validate required fields before allowing stage moves
  const validateLeadForStage = (lead: Lead, targetStageId: string | null): string | null => {
    if (!targetStageId) return null;
    const stage = stages.find(s => s.id === targetStageId);
    if (!stage) return null;
    const stageName = stage.nome.toLowerCase();

    // Stages that require contact info
    const contactRequiredStages = ['envio de cotação', 'negociação', 'fechamento', 'pós-venda'];
    if (contactRequiredStages.some(s => stageName.includes(s))) {
      if (!lead.contato && !lead.email) return `Para mover para "${stage.nome}", o lead precisa ter Contato ou E-mail preenchido.`;
    }

    // Stages that require documents
    const docRequiredStages = ['fechamento', 'pós-venda'];
    if (docRequiredStages.some(s => stageName.includes(s))) {
      const pf = isPessoaFisica(lead.tipo);
      if (pf && !lead.doc_foto_path) return `Para mover para "${stage.nome}", o lead precisa ter Documento com Foto anexado.`;
      if (!pf && !lead.cartao_cnpj_path) return `Para mover para "${stage.nome}", o lead precisa ter Cartão CNPJ anexado.`;
    }

    return null;
  };

  const handleDrop = (stageId: string | null) => {
    if (!draggedLeadId) return;
    const lead = leads.find(l => l.id === draggedLeadId);
    if (lead) {
      const error = validateLeadForStage(lead, stageId);
      if (error) {
        toast.error(error);
        setDraggedLeadId(null);
        return;
      }
    }
    moveMut.mutate({ leadId: draggedLeadId, stageId });
    setDraggedLeadId(null);
  };

  const openEdit = (l: Lead) => {
    if (!isAdmin) {
      setApprovalDialog({ type: 'edit', lead: l });
      setApprovalJustificativa('');
      return;
    }
    setEditItem(l);
    setForm({
      tipo: l.tipo, nome: l.nome, contato: l.contato || '', email: l.email || '',
      cpf: l.cpf || '', cnpj: l.cnpj || '', endereco: l.endereco || '',
      idade: (l as any).idade ? String((l as any).idade) : '',
      peso: (l as any).peso || '',
      altura: (l as any).altura || '',
      livre: (l as any).livre || false,
    });
    setFormStageId((l as any).stage_id || null);
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdf(null);
    setShowForm(true);
  };

  const requestDelete = (l: Lead) => {
    if (!isAdmin) {
      setApprovalDialog({ type: 'delete', lead: l });
      setApprovalJustificativa('');
      return;
    }
    setDeleteItem(l);
  };

  const openAdd = (stageId?: string | null) => {
    setEditItem(null);
    setForm({ tipo: defaultTipo, nome: '', contato: '', email: '', cpf: '', cnpj: '', endereco: '', idade: '', peso: '', altura: '', livre: false });
    setFormStageId(stageId ?? (stages.length > 0 ? stages[0].id : null));
    setDocFoto(null); setCartaoCnpj(null); setComprovanteEndereco(null); setCotacaoPdf(null);
    setShowForm(true);
  };

  const uploadFile = async (file: File, leadId: string, prefix: string): Promise<string> => {
    const filePath = `${leadId}/${prefix}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('lead-documentos').upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome.'); return; }
    setSaving(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const payload: any = {
      tipo: form.tipo, nome: form.nome.trim(), contato: form.contato || null,
      email: form.email || null, endereco: form.endereco || null, stage_id: formStageId,
      idade: form.idade ? parseInt(form.idade) : null,
      peso: form.peso || null,
      altura: form.altura || null,
    };
    payload.livre = form.livre;
    if (isPessoaFisica(form.tipo)) { payload.cpf = form.cpf || null; payload.cnpj = null; }
    else { payload.cnpj = form.cnpj || null; payload.cpf = null; }
    if (!editItem) { payload.created_by = currentUser?.id || null; }
    try {
      let leadId: string;
      if (editItem) {
        leadId = editItem.id;
        await updateMut.mutateAsync({ id: editItem.id, ...payload });
      } else {
        const result = await createMut.mutateAsync(payload);
        leadId = result.id;
      }
      const updates: any = {};
      if (docFoto) updates.doc_foto_path = await uploadFile(docFoto, leadId, 'doc_foto');
      if (cartaoCnpj) updates.cartao_cnpj_path = await uploadFile(cartaoCnpj, leadId, 'cartao_cnpj');
      if (comprovanteEndereco) updates.comprovante_endereco_path = await uploadFile(comprovanteEndereco, leadId, 'comprovante');
      if (cotacaoPdf) updates.boletos_path = await uploadFile(cotacaoPdf, leadId, 'cotacao');
      if (Object.keys(updates).length > 0) {
        await supabase.from('leads').update(updates as any).eq('id', leadId);
      }
      toast.success(editItem ? 'Lead atualizado!' : 'Lead criado!');
      logAction(editItem ? 'editar_lead' : 'criar_lead', 'lead', leadId, { nome: form.nome.trim() });
      setShowForm(false); setEditItem(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const sendApprovalRequest = async () => {
    if (!approvalDialog || !approvalJustificativa.trim()) { toast.error('Informe a justificativa.'); return; }
    setSendingApproval(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Não autenticado');
      const { error } = await supabase.from('correction_requests').insert({
        user_id: currentUser.id, tipo: approvalDialog.type === 'edit' ? 'lead_edit' : 'lead_delete',
        registro_id: approvalDialog.lead.id, motivo: approvalJustificativa.trim(),
      } as any);
      if (error) throw error;
      toast.success('Solicitação enviada ao supervisor!');
      setApprovalDialog(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingApproval(false); }
  };

  const FileUploadField = ({ label, file, onFileChange, existingPath }: { label: string; file: File | null; onFileChange: (f: File | null) => void; existingPath?: string | null }) => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <label className="cursor-pointer block">
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => onFileChange(e.target.files?.[0] || null)} />
        <span className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-xs hover:bg-muted transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
          {file ? <span className="text-success truncate">{file.name}</span> : existingPath ? <span className="text-muted-foreground">Arquivo existente ✓</span> : <span className="text-muted-foreground">Selecionar...</span>}
        </span>
      </label>
    </div>
  );

  if (stagesLoading || leadsLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">CRM — Board de Leads</h2>
          <p className="text-xs text-muted-foreground">Arraste leads entre colunas para atualizar o status</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-1.5 font-semibold shadow-brand" size="sm">
          <Plus className="w-4 h-4" /> Novo Lead
        </Button>
      </div>

      {!isAdmin && (
        <div className="bg-accent/50 rounded-xl p-3 border border-border/30 flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Você pode criar leads e movê-los entre colunas. Para <strong>editar</strong> ou <strong>excluir</strong>, envie uma solicitação ao supervisor.
          </p>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage.map[stage.id] || []}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={requestDelete}
            onDragStart={handleDragStart}
            onDrop={stageId => handleDrop(stageId)}
            onAddLead={stageId => openAdd(stageId)}
            getLeaderName={getLeaderName}
          />
        ))}
      </div>

      {/* Lead Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editItem ? 'Editar' : 'Novo'} Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {stages.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Coluna</label>
                <Select value={formStageId || 'none'} onValueChange={v => setFormStageId(v === 'none' ? null : v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem coluna</SelectItem>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor }} />{s.nome}</div></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tipo / Modalidade</label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modalidadesList.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome</label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground">Contato</label><Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">E-mail</label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-10" /></div>
            </div>
            {isPessoaFisica(form.tipo) ? (
              <div><label className="text-xs font-semibold text-muted-foreground">CPF</label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-10" /></div>
            ) : (
              <div><label className="text-xs font-semibold text-muted-foreground">CNPJ</label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} className="h-10" /></div>
            )}
            <div><label className="text-xs font-semibold text-muted-foreground">Endereço</label><Input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" /></div>
            
            {/* New fields: Idade, Peso, Altura */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground">Idade</label><Input type="number" value={form.idade} onChange={e => setForm(p => ({ ...p, idade: e.target.value }))} placeholder="Ex: 30" className="h-10" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">Peso</label><Input value={form.peso} onChange={e => setForm(p => ({ ...p, peso: e.target.value }))} placeholder="Ex: 80 kg" className="h-10" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground">Altura</label><Input value={form.altura} onChange={e => setForm(p => ({ ...p, altura: e.target.value }))} placeholder="Ex: 170 cm" className="h-10" /></div>
            </div>

            {/* Lead Livre (Admin only) */}
            {isAdmin && (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                <input type="checkbox" checked={form.livre} onChange={e => setForm(p => ({ ...p, livre: e.target.checked }))} className="w-4 h-4 rounded border-border" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Lead Livre</p>
                  <p className="text-[10px] text-muted-foreground">Qualquer consultor pode assumir este lead.</p>
                </div>
              </div>
            )}

            <div className="border-t border-border/20 pt-3 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.08em]">Documentos</p>
              {isPessoaFisica(form.tipo) && <FileUploadField label="Documento com Foto" file={docFoto} onFileChange={setDocFoto} existingPath={editItem?.doc_foto_path} />}
              {!isPessoaFisica(form.tipo) && <FileUploadField label="Cartão CNPJ" file={cartaoCnpj} onFileChange={setCartaoCnpj} existingPath={editItem?.cartao_cnpj_path} />}
              <FileUploadField label="Comprovante de Endereço" file={comprovanteEndereco} onFileChange={setComprovanteEndereco} existingPath={editItem?.comprovante_endereco_path} />
              <FileUploadField label="Cotação (PDF)" file={cotacaoPdf} onFileChange={setCotacaoPdf} existingPath={editItem?.boletos_path} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive font-display">Excluir Lead</DialogTitle><DialogDescription>Excluir "{deleteItem?.nome}"?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { setSaving(true); try { await deleteMut.mutateAsync(deleteItem!.id); toast.success('Excluído!'); setDeleteItem(null); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }} disabled={saving}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog (non-admins) */}
      <Dialog open={!!approvalDialog} onOpenChange={v => { if (!v) setApprovalDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{approvalDialog?.type === 'edit' ? 'Solicitar Edição' : 'Solicitar Exclusão'}</DialogTitle>
            <DialogDescription>Informe a justificativa para que seu supervisor aprove.</DialogDescription>
          </DialogHeader>
          <Textarea value={approvalJustificativa} onChange={e => setApprovalJustificativa(e.target.value)} placeholder="Justificativa..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancelar</Button>
            <Button onClick={sendApprovalRequest} disabled={sendingApproval}>{sendingApproval ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
