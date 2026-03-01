import { useState } from 'react';
import {
  User, Mail, Phone, Shield, Award, Building, Hash, CreditCard,
  FileText, MapPin, AlertTriangle, Users, Briefcase, Camera, Send,
  CalendarDays, Cake
} from 'lucide-react';
import { useProfile, useUserRole, useSupervisorProfile, useGerenteProfile, useTeamProfiles } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from '@/components/PatenteBadge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { maskPhone, maskCPF } from '@/lib/masks';

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border/20 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/6 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">{label}</p>
        <p className="text-[14px] font-semibold text-foreground mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

const Perfil = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const { data: gerente } = useGerenteProfile(profile?.gerente_id);
  const { data: allProfiles = [] } = useTeamProfiles();

  // Fallback: resolve supervisor/gerente from allProfiles if hooks return null
  const resolvedSupervisor = supervisor || (profile?.supervisor_id ? allProfiles.find(p => p.id === profile.supervisor_id) : null);
  const resolvedGerente = gerente || (profile?.gerente_id ? allProfiles.find(p => p.id === profile.gerente_id) : null);

  const [uploading, setUploading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const openChangeRequest = () => {
    if (!profile) return;
    setEditForm({
      nome_completo: profile.nome_completo || '',
      apelido: profile.apelido || '',
      email: profile.email || '',
      celular: profile.celular || '',
      cpf: profile.cpf || '',
      rg: profile.rg || '',
      endereco: profile.endereco || '',
      numero_emergencia_1: profile.numero_emergencia_1 || '',
      numero_emergencia_2: profile.numero_emergencia_2 || '',
      data_admissao: (profile as any).data_admissao || '',
      data_nascimento: (profile as any).data_nascimento || '',
    });
    setShowRequest(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileErr } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl } as any).eq('id', user.id);
      if (profileErr) throw profileErr;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto atualizada!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar foto.');
    } finally {
      setUploading(false);
    }
  };

  const sendDataChangeRequest = async () => {
    if (!user || !profile) return;
    setSendingRequest(true);
    try {
      const fieldLabels: Record<string, string> = {
        nome_completo: 'Nome Completo',
        apelido: 'Apelido',
        email: 'E-mail',
        celular: 'Celular',
        cpf: 'CPF',
        rg: 'RG',
        endereco: 'Endereço',
        numero_emergencia_1: 'Emergência 1',
        numero_emergencia_2: 'Emergência 2',
        data_admissao: 'Data de Admissão',
        data_nascimento: 'Data de Nascimento',
      };
      const changes: string[] = [];
      for (const [key, newVal] of Object.entries(editForm)) {
        const oldVal = (profile as any)[key] || '';
        if (newVal !== oldVal) {
          changes.push(`${fieldLabels[key] || key}: "${oldVal || '—'}" → "${newVal || '—'}"`);
        }
      }
      if (changes.length === 0) {
        toast.info('Nenhuma alteração detectada.');
        setSendingRequest(false);
        return;
      }
      const motivo = changes.join('\n');
      const { error } = await supabase.from('correction_requests').insert({
        user_id: user.id,
        tipo: 'profile_edit',
        registro_id: user.id,
        motivo,
      } as any);
      if (error) throw error;
      toast.success('Solicitação de alteração enviada ao administrador!');
      setShowRequest(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setSendingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) return <p className="text-muted-foreground">Perfil não encontrado.</p>;

  const percentMeta = 0;
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const nivelLabel = role === 'administrador' ? 'Administrador' : 'Usuário';

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Meu Perfil</h1>

      <div className="bg-card rounded-xl shadow-card border border-border/30 overflow-hidden">
        {/* Hero */}
        <div className="gradient-hero p-8 flex items-center gap-5">
          <div className={`w-[72px] h-[72px] rounded-full border-[3px] ${patente?.borderClass ?? 'border-white/20'} bg-white/10 flex items-center justify-center shrink-0 overflow-hidden relative group`}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl font-display">
                {(profile.apelido || profile.nome_completo).charAt(0).toUpperCase()}
              </span>
            )}
            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-display">{profile.nome_completo}</h2>
            <p className="text-sm text-white/60 mt-0.5">{profile.cargo}</p>
            {profile.codigo && <p className="text-xs text-white/30 mt-1 font-mono tracking-wider">ID {profile.codigo}</p>}
          </div>
        </div>

        {patente && (
          <div className="mx-6 mt-5 p-4 bg-accent/50 rounded-lg border border-border/20 flex items-center gap-3">
            <Award className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <PatenteBadge percentMeta={percentMeta} size="sm" />
              <p className="text-[11px] text-muted-foreground italic mt-1">{frase}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Dados Pessoais */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={User} label="Nome Completo" value={profile.nome_completo} />
              <InfoRow icon={Hash} label="ID Consultor" value={profile.codigo || '—'} />
              <InfoRow icon={Mail} label="E-mail" value={profile.email} />
              <InfoRow icon={Phone} label="Celular" value={profile.celular || '—'} />
              <InfoRow icon={CreditCard} label="CPF" value={profile.cpf || '—'} />
              <InfoRow icon={FileText} label="RG" value={profile.rg || '—'} />
              <InfoRow icon={CalendarDays} label="Data de Admissão" value={(profile as any).data_admissao ? new Date((profile as any).data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
              <InfoRow icon={Cake} label="Data de Nascimento" value={(profile as any).data_nascimento ? new Date((profile as any).data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} />
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Endereço" value={profile.endereco || '—'} />
                {profile.endereco && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border/20">
                    <iframe
                      title="Mapa"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(profile.endereco)}&output=embed`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Emergência */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Contatos de Emergência
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={Phone} label="Emergência 1" value={profile.numero_emergencia_1 || '—'} />
              <InfoRow icon={Phone} label="Emergência 2" value={profile.numero_emergencia_2 || '—'} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Cargo */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" /> Cargo & Acesso
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow icon={Building} label="Cargo" value={profile.cargo} />
              <InfoRow icon={Shield} label="Nível de Acesso" value={nivelLabel} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Líderes */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Líderes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/20 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Supervisor</p>
                <p className="text-sm font-bold text-foreground">{resolvedSupervisor?.nome_completo || '—'}</p>
                {resolvedSupervisor?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {resolvedSupervisor.email}
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border/20 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Gerência</p>
                <p className="text-sm font-bold text-foreground">{resolvedGerente?.nome_completo || '—'}</p>
                {resolvedGerente?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {resolvedGerente.email}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={openChangeRequest} className="gap-1.5">
          <Send className="w-4 h-4" /> Solicitar alteração de meus dados
        </Button>
      </div>

      {/* Full Profile Edit Request Dialog */}
      <Dialog open={showRequest} onOpenChange={v => { if (!v) setShowRequest(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Solicitar Alteração de Dados</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Edite os campos que deseja alterar. As mudanças serão enviadas para aprovação.</p>

          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Nome Completo</Label>
                <Input value={editForm.nome_completo || ''} onChange={e => setEditForm(p => ({ ...p, nome_completo: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Apelido</Label>
                <Input value={editForm.apelido || ''} onChange={e => setEditForm(p => ({ ...p, apelido: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">E-mail</Label>
                <Input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Celular</Label>
                <Input value={editForm.celular || ''} onChange={e => setEditForm(p => ({ ...p, celular: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">CPF</Label>
                <Input value={editForm.cpf || ''} onChange={e => setEditForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">RG</Label>
                <Input value={editForm.rg || ''} onChange={e => setEditForm(p => ({ ...p, rg: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Endereço</Label>
              <Input value={editForm.endereco || ''} onChange={e => setEditForm(p => ({ ...p, endereco: e.target.value }))} className="h-10" />
            </div>
            <Separator className="bg-border/20" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-bold">Contatos de Emergência</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Emergência 1</Label>
                <Input value={editForm.numero_emergencia_1 || ''} onChange={e => setEditForm(p => ({ ...p, numero_emergencia_1: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Emergência 2</Label>
                <Input value={editForm.numero_emergencia_2 || ''} onChange={e => setEditForm(p => ({ ...p, numero_emergencia_2: maskPhone(e.target.value) }))} placeholder="+55 (11) 90000-0000" className="h-10" />
              </div>
            </div>
            <Separator className="bg-border/20" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-bold">Datas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Data de Admissão</Label>
                <Input type="date" value={editForm.data_admissao || ''} onChange={e => setEditForm(p => ({ ...p, data_admissao: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Data de Nascimento</Label>
                <Input type="date" value={editForm.data_nascimento || ''} onChange={e => setEditForm(p => ({ ...p, data_nascimento: e.target.value }))} className="h-10" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequest(false)}>Cancelar</Button>
            <Button onClick={sendDataChangeRequest} disabled={sendingRequest}>
              {sendingRequest ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Perfil;
