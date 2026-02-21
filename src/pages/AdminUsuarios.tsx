import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useUserTabPermissions, useSetTabPermission, ALL_TABS } from '@/hooks/useTabPermissions';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { maskCPF, maskRG, maskPhone } from '@/lib/masks';
import {
  UserPlus, Users, Mail, Phone, CreditCard, FileText,
  MapPin, AlertTriangle, Shield, Building, Camera, Search, Info, Trash2,
  Ban, CheckCircle2, Plus
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/hooks/useProfile';

function FieldWithTooltip({ label, tooltip, required, children }: { label: string; tooltip: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs">{label}{required ? ' *' : ''}</Label>
        <Tooltip>
          <TooltipTrigger tabIndex={-1}>
            <Info className="w-3 h-3 text-muted-foreground/50 hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

const CARGOS = ['Consultor de Vendas', 'Supervisor', 'Gerente', 'Diretor'];
const ROLES: Array<{ value: 'consultor' | 'administrador'; label: string }> = [
  { value: 'consultor', label: 'Usuário' },
  { value: 'administrador', label: 'Administrador' },
];

interface FormData {
  email: string;
  nome_completo: string;
  apelido: string;
  celular: string;
  cpf: string;
  rg: string;
  endereco: string;
  cargo: string;
  codigo: string;
  role: 'consultor' | 'supervisor' | 'gerente' | 'administrador';
  numero_emergencia_1: string;
  numero_emergencia_2: string;
  supervisor_id: string;
  gerente_id: string;
  meta_faturamento: string;
  atividades_desabilitadas: boolean;
}

const emptyForm: FormData = {
  email: '', nome_completo: '', apelido: '', celular: '', cpf: '', rg: '',
  endereco: '', cargo: 'Consultor de Vendas', codigo: '', role: 'consultor',
  numero_emergencia_1: '', numero_emergencia_2: '', supervisor_id: '', gerente_id: '',
  meta_faturamento: '', atividades_desabilitadas: false,
};

// Component: Tab permissions panel shown inside edit dialog
function TabPermissionsPanel({ userId }: { userId: string }) {
  const { data: perms = [], isLoading } = useUserTabPermissions(userId);
  const setTabPerm = useSetTabPermission();

  const isEnabled = (key: string) => {
    const p = perms.find(p => p.tab_key === key);
    return p ? p.enabled : true; // default: enabled
  };

  const handleToggle = (key: string, enabled: boolean) => {
    setTabPerm.mutate({ userId, tabKey: key, enabled });
  };

  if (isLoading) return null;

  return (
    <div>
      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
        <span>🔒</span> Permissão de Guias
      </h3>
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/20">
        <p className="text-xs text-muted-foreground mb-3">Defina quais guias este usuário pode visualizar. Guias de acesso por cargo (Aprovações, Dashboard) continuam restritas pelo nível.</p>
        {ALL_TABS.map(tab => (
          <div key={tab.key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-foreground">{tab.label}</span>
            <Switch
              checked={isEnabled(tab.key)}
              onCheckedChange={(v) => handleToggle(tab.key, v)}
              disabled={setTabPerm.isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const AdminUsuarios = () => {
  const { data: role } = useUserRole();
  const { data: allProfiles, isLoading } = useTeamProfiles();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);
  const [disableConfirm, setDisableConfirm] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('active');
  const queryClient = useQueryClient();

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

  const supervisors = allProfiles?.filter(p => p.cargo?.toLowerCase().includes('supervisor')) ?? [];
  const gerentes = allProfiles?.filter(p => p.cargo?.toLowerCase().includes('gerente') || p.cargo?.toLowerCase().includes('diretor')) ?? [];

  const filtered = allProfiles?.filter(p => {
    const matchesSearch = p.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()));
    const isDisabled = (p as any).disabled === true;
    if (filterStatus === 'active') return matchesSearch && !isDisabled;
    if (filterStatus === 'disabled') return matchesSearch && isDisabled;
    return matchesSearch;
  }) ?? [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const setField = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-clear supervisor/gerente when cargo changes
      if (key === 'cargo') {
        if (['Supervisor', 'Gerente', 'Diretor'].includes(value as string)) {
          next.supervisor_id = 'none';
        }
        if (['Gerente', 'Diretor'].includes(value as string)) {
          next.gerente_id = 'none';
        }
      }
      return next;
    });
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setAvatarFile(null);
    setAvatarPreview(null);
    setOpen(true);
  };

  const handleEdit = async (profile: Profile) => {
    setEditingId(profile.id);
    // Fetch the current role from DB to avoid overwriting with default
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .maybeSingle();
    const currentRole = (roleData?.role as FormData['role']) || 'consultor';
    setForm({
      email: profile.email,
      nome_completo: profile.nome_completo,
      apelido: profile.apelido || '',
      celular: profile.celular || '',
      cpf: profile.cpf || '',
      rg: profile.rg || '',
      endereco: profile.endereco || '',
      cargo: profile.cargo,
      codigo: profile.codigo || '',
      role: currentRole,
      numero_emergencia_1: profile.numero_emergencia_1 || '',
      numero_emergencia_2: profile.numero_emergencia_2 || '',
      supervisor_id: profile.supervisor_id || 'none',
      gerente_id: profile.gerente_id || 'none',
      meta_faturamento: profile.meta_faturamento?.toString() || '',
      atividades_desabilitadas: (profile as any).atividades_desabilitadas === true,
    });
    setAvatarPreview(profile.avatar_url);
    setAvatarFile(null);
    setOpen(true);
  };

  const generateCodigo = () => {
    const count = allProfiles?.length ?? 0;
    return `GN${String(count + 1).padStart(3, '0')}`;
  };

  const handleSave = async () => {
    const required: (keyof FormData)[] = [
      'email', 'nome_completo', 'apelido', 'celular', 'cpf', 'rg',
      'endereco', 'cargo', 'numero_emergencia_1', 'numero_emergencia_2',
    ];
    for (const field of required) {
      const val = form[field];
      if (typeof val === 'string' && !val.trim()) {
        toast.error(`Preencha o campo ${field.replace(/_/g, ' ')}.`);
        return;
      }
    }

    setSaving(true);
    try {
      let avatarUrl = avatarPreview;
      let codigo = form.codigo;
      if (!codigo.trim()) {
        codigo = generateCodigo();
      }

      if (avatarFile && editingId) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${editingId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      if (editingId) {
        const { error } = await supabase.from('profiles').update({
          nome_completo: form.nome_completo,
          apelido: form.apelido,
          celular: form.celular,
          cpf: form.cpf,
          rg: form.rg,
          endereco: form.endereco,
          cargo: form.cargo,
          codigo,
          numero_emergencia_1: form.numero_emergencia_1,
          numero_emergencia_2: form.numero_emergencia_2,
          supervisor_id: form.supervisor_id && form.supervisor_id !== 'none' ? form.supervisor_id : null,
          gerente_id: form.gerente_id && form.gerente_id !== 'none' ? form.gerente_id : null,
          meta_faturamento: form.meta_faturamento ? parseFloat(form.meta_faturamento) : null,
          avatar_url: avatarUrl,
          atividades_desabilitadas: form.atividades_desabilitadas,
        }).eq('id', editingId);

        if (error) throw error;
        await supabase.from('user_roles').update({ role: form.role }).eq('user_id', editingId);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        toast.info('O perfil será criado automaticamente quando o usuário fizer login com o Google pela primeira vez. Os dados serão atualizados após o primeiro login.');
      }

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'novo_usuario',
            data: { nome: form.nome_completo, email: form.email, cargo: form.cargo },
          },
        });
      } catch (e) {
        console.error('Notification error:', e);
      }

      queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
      setOpen(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleToggleDisable = async (profile: Profile) => {
    setToggling(true);
    try {
      const isDisabled = (profile as any).disabled === true;
      const { error } = await supabase.from('profiles').update({ disabled: !isDisabled } as any).eq('id', profile.id);
      if (error) throw error;
      toast.success(isDisabled ? 'Usuário reativado!' : 'Usuário desabilitado!');
      queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
      setDisableConfirm(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre, edite e gerencie os colaboradores</p>
        </div>
        <Button onClick={handleNew} className="gap-1.5 font-semibold shadow-brand">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card border-border/40"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[160px] h-11 border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="disabled">Desabilitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          filtered.map((p) => {
            const isDisabled = (p as any).disabled === true;
            return (
              <div
                key={p.id}
                className={`bg-card rounded-xl border shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-all ${isDisabled ? 'border-destructive/20 opacity-60' : 'border-border/30'}`}
              >
                <div onClick={() => handleEdit(p)} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-sm">
                        {p.nome_completo.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{p.nome_completo}</p>
                      {isDisabled && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Desabilitado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-foreground">{p.cargo}</p>
                    {p.codigo && <p className="text-[10px] text-muted-foreground font-mono">ID {p.codigo}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 ${isDisabled ? 'text-success hover:bg-success/10' : 'text-warning hover:bg-warning/10'}`}
                    onClick={(e) => { e.stopPropagation(); setDisableConfirm(p); }}
                    title={isDisabled ? 'Reativar' : 'Desabilitar'}
                  >
                    {isDisabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm({ ...emptyForm }); setAvatarFile(null); setAvatarPreview(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-brand hover:bg-primary/90 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Foto de Perfil</p>
                <p className="text-xs text-muted-foreground">JPG, PNG. Máx 5MB.</p>
              </div>
            </div>

            {/* Personal Info */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Nome Completo" tooltip="Nome completo do colaborador conforme documento oficial." required>
                  <Input value={form.nome_completo} onChange={(e) => setField('nome_completo', e.target.value)} className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="Apelido" tooltip="Nome pelo qual o colaborador é conhecido no dia a dia." required>
                  <Input value={form.apelido} onChange={(e) => setField('apelido', e.target.value)} className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="E-mail (Google)" tooltip="Conta Google que será usada para login no sistema. Não pode ser alterada após o cadastro." required>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={!!editingId} className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="Celular" tooltip="Número de celular pessoal com DDD. Formato: +55 (11) 90000-0000." required>
                  <Input value={form.celular} onChange={(e) => setField('celular', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="CPF" tooltip="Cadastro de Pessoa Física. Formato: 000.000.000-00." required>
                  <Input value={form.cpf} onChange={(e) => setField('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="RG" tooltip="Registro Geral (identidade). Formato: 000.000.000-0." required>
                  <Input value={form.rg} onChange={(e) => setField('rg', maskRG(e.target.value))} placeholder="000.000.000-0" className="h-10" />
                </FieldWithTooltip>
                <div className="sm:col-span-2">
                  <FieldWithTooltip label="Endereço" tooltip="Endereço completo do colaborador (rua, número, bairro, cidade, estado)." required>
                    <Input value={form.endereco} onChange={(e) => setField('endereco', e.target.value)} className="h-10" />
                  </FieldWithTooltip>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Contatos de Emergência
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Emergência 1" tooltip="Número de um contato de emergência (familiar ou próximo)." required>
                  <Input value={form.numero_emergencia_1} onChange={(e) => setField('numero_emergencia_1', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="Emergência 2" tooltip="Segundo contato de emergência. Deve ser diferente do primeiro." required>
                  <Input value={form.numero_emergencia_2} onChange={(e) => setField('numero_emergencia_2', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </FieldWithTooltip>
              </div>
            </div>

            {/* Role & Hierarchy */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Cargo & Líderes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="ID/Código" tooltip="Gerado automaticamente pelo sistema. Ex: GN001.">
                  <Input value={form.codigo} disabled placeholder="Gerado automaticamente" className="h-10 bg-muted/50" />
                </FieldWithTooltip>
                <FieldWithTooltip label="Cargo" tooltip="Cargo oficial do colaborador na empresa." required>
                  <Select value={form.cargo} onValueChange={(v) => setField('cargo', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
                <FieldWithTooltip label="Nível de Acesso" tooltip="Usuário (básico) ou Administrador (total)." required>
                  <Select value={form.role} onValueChange={(v) => setField('role', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
                <FieldWithTooltip label="Meta Faturamento (R$)" tooltip="Meta mensal de faturamento em reais.">
                  <Input type="number" value={form.meta_faturamento} onChange={(e) => setField('meta_faturamento', e.target.value)} className="h-10" />
                </FieldWithTooltip>
                <FieldWithTooltip label="Supervisor" tooltip="Supervisor direto do colaborador. Bloqueado para Supervisores e acima.">
                  <Select 
                    value={form.supervisor_id} 
                    onValueChange={(v) => setField('supervisor_id', v)}
                    disabled={['Supervisor', 'Gerente', 'Diretor'].includes(form.cargo)}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
                <FieldWithTooltip label="Gerente" tooltip="Gerente responsável pela equipe. Bloqueado para Gerentes e Diretores.">
                  <Select 
                    value={form.gerente_id} 
                    onValueChange={(v) => setField('gerente_id', v)}
                    disabled={['Gerente', 'Diretor'].includes(form.cargo)}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {gerentes.map(g => <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>
              </div>

            </div>

            {/* Tab Permissions (only when editing existing user) */}
            {editingId && <TabPermissionsPanel userId={editingId} />}

            <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-semibold shadow-brand min-w-[160px]">
              {saving ? (
                <><div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" /> Salvando...</>
              ) : (
                <>{editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Confirm */}
      <Dialog open={!!disableConfirm} onOpenChange={(v) => { if (!v) setDisableConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {(disableConfirm as any)?.disabled ? 'Reativar Usuário' : 'Desabilitar Usuário'}
            </DialogTitle>
            <DialogDescription>
              {(disableConfirm as any)?.disabled
                ? `Deseja reativar ${disableConfirm?.nome_completo}? O usuário poderá acessar o sistema novamente.`
                : `Deseja desabilitar ${disableConfirm?.nome_completo}? O usuário não poderá mais acessar o sistema, mas seus registros serão mantidos.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisableConfirm(null)}>Cancelar</Button>
            <Button
              variant={(disableConfirm as any)?.disabled ? 'default' : 'destructive'}
              disabled={toggling}
              onClick={() => disableConfirm && handleToggleDisable(disableConfirm)}
            >
              {toggling ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                (disableConfirm as any)?.disabled
                  ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Reativar</>
                  : <><Ban className="w-4 h-4 mr-1" /> Desabilitar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">Excluir Usuário Permanentemente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.nome_completo}</strong>? Esta ação é irreversível e remove todos os registros. Considere desabilitar o usuário para manter o histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteConfirm) return;
                setDeleting(true);
                try {
                  // Delete auth user first (this cascades profile via trigger)
                  const { data: delResult, error: delError } = await supabase.functions.invoke('admin-delete-user', {
                    body: { user_id: deleteConfirm.id },
                  });
                  if (delError) throw delError;
                  if (delResult?.error) throw new Error(delResult.error);
                  // Clean up remaining data
                  await supabase.from('user_roles').delete().eq('user_id', deleteConfirm.id);
                  await supabase.from('profiles').delete().eq('id', deleteConfirm.id);
                  toast.success('Usuário excluído!');
                  queryClient.invalidateQueries({ queryKey: ['team-profiles'] });
                  setDeleteConfirm(null);
                } catch (err: any) {
                  toast.error(err.message || 'Erro ao excluir usuário.');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Excluir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsuarios;
