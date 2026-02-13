import {
  User, Mail, Phone, Shield, Award, Building, Hash, CreditCard,
  FileText, MapPin, AlertTriangle, Users, Briefcase
} from 'lucide-react';
import { useProfile, useUserRole, useSupervisorProfile, useGerenteProfile } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from '@/components/PatenteBadge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { data: profile, isLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const { data: gerente } = useGerenteProfile(profile?.gerente_id);

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
          <div className={`w-[72px] h-[72px] rounded-full border-[3px] ${patente?.borderClass ?? 'border-white/20'} bg-white/10 flex items-center justify-center shrink-0 overflow-hidden`}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl font-display">
                {(profile.apelido || profile.nome_completo).charAt(0).toUpperCase()}
              </span>
            )}
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
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Endereço" value={profile.endereco || '—'} />
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
                <p className="text-sm font-bold text-foreground">{supervisor?.nome_completo || '—'}</p>
                {supervisor?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {supervisor.email}
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border/20 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Gerência</p>
                <p className="text-sm font-bold text-foreground">{gerente?.nome_completo || '—'}</p>
                {gerente?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {gerente.email}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 text-center">
        Para alterar qualquer informação, entre em contato com um administrador.
      </p>
    </div>
  );
};

export default Perfil;
