import {
  User, Mail, Phone, Shield, Award, Building, Hash, CreditCard,
  FileText, MapPin, AlertTriangle, Users, Briefcase
} from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from '@/components/PatenteBadge';
import { Separator } from '@/components/ui/separator';

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
        <p className="text-[15px] font-semibold text-foreground mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

const Perfil = () => {
  const patente = getPatente(currentUser.percentMeta);
  const frase = getFraseMotivacional(currentUser.percentMeta);
  const nivelLabel = currentUser.nivel_acesso === 'administrador' ? 'Administrador' : 'Usuário';

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Meu Perfil</h1>

      {/* Header Card */}
      <div className="bg-card rounded-2xl shadow-card border border-border/40 overflow-hidden">
        <div className="gradient-brand p-8 flex items-center gap-6">
          <div className={`w-20 h-20 rounded-full border-[3px] ${patente?.borderClass ?? 'border-sidebar-border'} bg-sidebar-accent flex items-center justify-center shrink-0`}>
            <span className="text-sidebar-foreground font-bold text-3xl">
              {currentUser.apelido.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-foreground font-display">{currentUser.nome_completo}</h2>
            <p className="text-sm text-primary-foreground/70 mt-0.5">{currentUser.cargo}</p>
            <p className="text-xs text-primary-foreground/50 mt-1 font-mono">ID: {currentUser.codigo}</p>
          </div>
        </div>

        {/* Patente */}
        {patente && (
          <div className="mx-6 mt-5 p-4 bg-accent/40 rounded-xl border border-border/30 flex items-center gap-3">
            <Award className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <PatenteBadge percentMeta={currentUser.percentMeta} size="sm" />
              <p className="text-xs text-muted-foreground italic mt-1">{frase}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-8">
          {/* Dados Pessoais */}
          <div>
            <SectionHeader icon={User} title="Dados Pessoais" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={User} label="Nome Completo" value={currentUser.nome_completo} />
              <InfoRow icon={Hash} label="ID Consultor" value={currentUser.codigo} />
              <InfoRow icon={Mail} label="E-mail" value={currentUser.email} />
              <InfoRow icon={Phone} label="Celular" value={currentUser.celular} />
              <InfoRow icon={CreditCard} label="CPF" value={currentUser.cpf} />
              <InfoRow icon={FileText} label="RG" value={currentUser.rg} />
              <div className="sm:col-span-2">
                <InfoRow icon={MapPin} label="Endereço" value={currentUser.endereco} />
              </div>
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Contatos de Emergência */}
          <div>
            <SectionHeader icon={AlertTriangle} title="Contatos de Emergência" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={Phone} label="Emergência 1" value={currentUser.numero_emergencia_1} />
              <InfoRow icon={Phone} label="Emergência 2" value={currentUser.numero_emergencia_2} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Cargo & Acesso */}
          <div>
            <SectionHeader icon={Briefcase} title="Cargo & Acesso" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <InfoRow icon={Building} label="Cargo" value={currentUser.cargo} />
              <InfoRow icon={Shield} label="Nível de Acesso" value={nivelLabel} />
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Hierarquia */}
          <div>
            <SectionHeader icon={Users} title="Hierarquia" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-accent/30 rounded-xl border border-border/30 space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Supervisor</p>
                <p className="text-sm font-bold text-foreground">{currentUser.supervisor_nome}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {currentUser.supervisor_email}
                </div>
              </div>
              <div className="p-5 bg-accent/30 rounded-xl border border-border/30 space-y-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Gerência</p>
                <p className="text-sm font-bold text-foreground">{currentUser.gerente_nome}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {currentUser.gerente_email}
                </div>
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
