import {
  User, Mail, Phone, Shield, Award, Building, Hash, CreditCard,
  FileText, MapPin, AlertTriangle, Users, Briefcase
} from 'lucide-react';
import { useProfile, useUserRole, useSupervisorProfile } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from '@/components/PatenteBadge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground font-display uppercase tracking-widest">{title}</h3>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-border/20 last:border-0">
      <Icon className="w-4 h-4 text-primary mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{label}</p>
        <p className="text-[15px] font-semibold text-foreground mt-1 tracking-tight">{value || '—'}</p>
      </div>
    </div>
  );
}

const Perfil = () => {
  const { data: profile, isLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!profile) return <p className="text-muted-foreground">Perfil não encontrado.</p>;

  const percentMeta = 0; // calculated from atividades
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const nivelLabel = role === 'administrador' ? 'Administrador' : role === 'gerente' ? 'Gerente' : role === 'supervisor' ? 'Supervisor' : 'Consultor';

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Meu Perfil</h1>

      <div className="bg-card rounded-2xl shadow-card border border-border/40 overflow-hidden">
        <div className="gradient-brand p-8 flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full border-[3px] ${patente?.borderClass ?? 'border-sidebar-border'} bg-sidebar-accent flex items-center justify-center shrink-0`}>
            <span className="text-sidebar-foreground font-bold text-3xl">
              {(profile.apelido || profile.nome_completo).charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-foreground font-display">{profile.nome_completo}</h2>
            <p className="text-sm text-primary-foreground/70 mt-0.5">{profile.cargo}</p>
            {profile.codigo && <p className="text-xs text-primary-foreground/50 mt-1 font-mono">ID: {profile.codigo}</p>}
          </div>
        </div>

        {patente && (
          <div className="mx-6 mt-5 p-4 bg-accent/40 rounded-xl border border-border/30 flex items-center gap-3">
            <Award className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <PatenteBadge percentMeta={percentMeta} size="sm" />
              <p className="text-xs text-muted-foreground italic mt-1">{frase}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-8">
          <div>
            <SectionHeader icon={User} title="Dados Pessoais" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={User} label="Nome Completo" value={profile.nome_completo} />
              <InfoRow icon={Hash} label="ID Consultor" value={profile.codigo || '—'} />
              <InfoRow icon={Mail} label="E-mail" value={profile.email} />
              <InfoRow icon={Phone} label="Celular" value={profile.celular || '—'} />
              <InfoRow icon={CreditCard} label="CPF" value={profile.cpf || '—'} />
              <InfoRow icon={FileText} label="RG" value={profile.rg || '—'} />
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Endereço" value={profile.endereco || '—'} />
              </div>
            </div>
          </div>

          <Separator className="bg-border/20" />

          <div>
            <SectionHeader icon={AlertTriangle} title="Contatos de Emergência" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={Phone} label="Emergência 1" value={profile.numero_emergencia_1 || '—'} />
              <InfoRow icon={Phone} label="Emergência 2" value={profile.numero_emergencia_2 || '—'} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          <div>
            <SectionHeader icon={Briefcase} title="Cargo & Acesso" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={Building} label="Cargo" value={profile.cargo} />
              <InfoRow icon={Shield} label="Nível de Acesso" value={nivelLabel} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          <div>
            <SectionHeader icon={Users} title="Hierarquia" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-accent/30 rounded-xl border border-border/30 space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Supervisor</p>
                <p className="text-sm font-bold text-foreground">{supervisor?.nome_completo || '—'}</p>
                {supervisor?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {supervisor.email}
                  </div>
                )}
              </div>
              <div className="p-5 bg-accent/30 rounded-xl border border-border/30 space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Gerência</p>
                <p className="text-sm font-bold text-foreground">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center italic">
        Para alterar qualquer informação deste perfil, entre em contato com um administrador.
      </p>
    </div>
  );
};

export default Perfil;
