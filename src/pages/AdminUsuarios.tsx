import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { maskCPF, maskRG, maskPhone } from '@/lib/masks';
import {
  UserPlus, Users, Mail, Phone, CreditCard, FileText,
  MapPin, AlertTriangle, Shield, Building, Camera, Search
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@/hooks/useProfile';

const CARGOS = ['Consultor de Vendas', 'Supervisor', 'Gerente', 'Diretor'];
const ROLES: Array<{ value: 'consultor' | 'supervisor' | 'gerente' | 'administrador'; label: string }> = [
  { value: 'consultor', label: 'Consultor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'gerente', label: 'Gerente' },
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
}

const emptyForm: FormData = {
  email: '', nome_completo: '', apelido: '', celular: '', cpf: '', rg: '',
  endereco: '', cargo: 'Consultor de Vendas', codigo: '', role: 'consultor',
  numero_emergencia_1: '', numero_emergencia_2: '', supervisor_id: '', gerente_id: '',
  meta_faturamento: '',
};

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

  const supervisors = allProfiles?.filter(p => {
    // profiles that have supervisor or gerente role - simplified check by cargo
    return p.cargo?.toLowerCase().includes('supervisor');
  }) ?? [];

  const gerentes = allProfiles?.filter(p => {
    return p.cargo?.toLowerCase().includes('gerente') || p.cargo?.toLowerCase().includes('diretor');
  }) ?? [];

  const filtered = allProfiles?.filter(p =>
    p.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const setField = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = (profile: Profile) => {
    setEditingId(profile.id);
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
      role: 'consultor', // will be fetched separately if needed
      numero_emergencia_1: profile.numero_emergencia_1 || '',
      numero_emergencia_2: profile.numero_emergencia_2 || '',
      supervisor_id: profile.supervisor_id || '',
      gerente_id: profile.gerente_id || '',
      meta_faturamento: profile.meta_faturamento?.toString() || '',
    });
    setAvatarPreview(profile.avatar_url);
    setAvatarFile(null);
    setOpen(true);
  };

  const handleSave = async () => {
    // Validate required fields
    const required: (keyof FormData)[] = [
      'email', 'nome_completo', 'apelido', 'celular', 'cpf', 'rg',
      'endereco', 'cargo', 'codigo', 'numero_emergencia_1', 'numero_emergencia_2',
    ];
    for (const field of required) {
      if (!form[field]?.trim()) {
        toast.error(`Preencha o campo ${field.replace(/_/g, ' ')}.`);
        return;
      }
    }

    setSaving(true);
    try {
      let avatarUrl = avatarPreview;

      // Upload avatar if new file
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
        // Update existing profile
        const { error } = await supabase.from('profiles').update({
          nome_completo: form.nome_completo,
          apelido: form.apelido,
          celular: form.celular,
          cpf: form.cpf,
          rg: form.rg,
          endereco: form.endereco,
          cargo: form.cargo,
          codigo: form.codigo,
          numero_emergencia_1: form.numero_emergencia_1,
          numero_emergencia_2: form.numero_emergencia_2,
          supervisor_id: form.supervisor_id || null,
          gerente_id: form.gerente_id || null,
          meta_faturamento: form.meta_faturamento ? parseFloat(form.meta_faturamento) : null,
          avatar_url: avatarUrl,
        }).eq('id', editingId);

        if (error) throw error;

        // Update role
        await supabase.from('user_roles').update({ role: form.role }).eq('user_id', editingId);

        toast.success('Usuário atualizado com sucesso!');
      } else {
        // For new users: the profile is auto-created via the trigger when they first sign in with Google.
        // Admin pre-registers by creating a profile entry for the email.
        // We'll insert into profiles with a temporary UUID that will be matched on first login.
        toast.info('O perfil será criado automaticamente quando o usuário fizer login com o Google pela primeira vez. Atualize os dados após o primeiro login.');
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre e edite os dados dos colaboradores</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-card border-border/40"
        />
      </div>

      {/* Users list */}
      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => handleEdit(p)}
              className="bg-card rounded-xl border border-border/30 shadow-card p-4 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all"
            >
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
                <p className="text-sm font-semibold text-foreground truncate">{p.nome_completo}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-foreground">{p.cargo}</p>
                {p.codigo && <p className="text-[10px] text-muted-foreground font-mono">ID {p.codigo}</p>}
              </div>
            </div>
          ))
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome Completo *</Label>
                  <Input value={form.nome_completo} onChange={(e) => setField('nome_completo', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Apelido *</Label>
                  <Input value={form.apelido} onChange={(e) => setField('apelido', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail (Google) *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={!!editingId} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Celular *</Label>
                  <Input value={form.celular} onChange={(e) => setField('celular', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CPF *</Label>
                  <Input value={form.cpf} onChange={(e) => setField('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">RG *</Label>
                  <Input value={form.rg} onChange={(e) => setField('rg', maskRG(e.target.value))} placeholder="000.000.000-0" className="h-10" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Endereço *</Label>
                  <Input value={form.endereco} onChange={(e) => setField('endereco', e.target.value)} className="h-10" />
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Contatos de Emergência
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Emergência 1 *</Label>
                  <Input value={form.numero_emergencia_1} onChange={(e) => setField('numero_emergencia_1', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Emergência 2 *</Label>
                  <Input value={form.numero_emergencia_2} onChange={(e) => setField('numero_emergencia_2', maskPhone(e.target.value))} placeholder="+55 (11) 90000-0000" className="h-10" />
                </div>
              </div>
            </div>

            {/* Role & Hierarchy */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Cargo & Hierarquia
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">ID/Código *</Label>
                  <Input value={form.codigo} onChange={(e) => setField('codigo', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cargo *</Label>
                  <Select value={form.cargo} onValueChange={(v) => setField('cargo', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nível de Acesso *</Label>
                  <Select value={form.role} onValueChange={(v) => setField('role', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta Faturamento (R$)</Label>
                  <Input type="number" value={form.meta_faturamento} onChange={(e) => setField('meta_faturamento', e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Supervisor</Label>
                  <Select value={form.supervisor_id} onValueChange={(v) => setField('supervisor_id', v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.nome_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gerente</Label>
                  <Select value={form.gerente_id} onValueChange={(v) => setField('gerente_id', v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {gerentes.map(g => <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-semibold shadow-brand">
              {saving ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>{editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsuarios;
