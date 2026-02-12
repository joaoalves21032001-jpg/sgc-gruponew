import { User, Mail, Phone, Shield, Award, Building } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from '@/components/PatenteBadge';

const Perfil = () => {
  const patente = getPatente(currentUser.percentMeta);
  const frase = getFraseMotivacional(currentUser.percentMeta);

  const fields = [
    { icon: User, label: 'Nome Completo', value: currentUser.nome_completo },
    { icon: Mail, label: 'E-mail', value: currentUser.email },
    { icon: Building, label: 'Cargo', value: currentUser.cargo },
    { icon: Shield, label: 'Nível de Acesso', value: currentUser.perfil.charAt(0).toUpperCase() + currentUser.perfil.slice(1) },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold font-display text-foreground">Meu Perfil</h1>

      {/* Profile Card */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="gradient-brand p-6 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full border-[3px] ${patente?.borderClass ?? 'border-sidebar-border'} bg-sidebar-accent flex items-center justify-center`}>
            <span className="text-sidebar-foreground font-bold text-xl">
              {currentUser.apelido.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">{currentUser.nome_completo}</h2>
            <p className="text-sm text-primary-foreground/70">{currentUser.cargo}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {patente && (
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <Award className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <PatenteBadge percentMeta={currentUser.percentMeta} size="sm" />
                <p className="text-xs text-muted-foreground italic mt-1">{frase}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <f.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium text-foreground">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
