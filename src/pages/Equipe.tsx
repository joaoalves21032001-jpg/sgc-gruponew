import { useState, useMemo } from 'react';
import { useTeamProfiles, useUserRole, type Profile } from '@/hooks/useProfile';
import { useMyVendas } from '@/hooks/useVendas';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Search, Users, Mail, Phone, Briefcase, Calendar, Award, TrendingUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function useAllVendasCount() {
  return useQuery({
    queryKey: ['all-vendas-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('user_id, status')
        .eq('status', 'aprovado');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const v of (data ?? [])) {
        counts[v.user_id] = (counts[v.user_id] || 0) + 1;
      }
      return counts;
    },
  });
}

function calcTempoEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const adm = new Date(dataAdmissao + 'T12:00:00');
  const now = new Date();
  const months = (now.getFullYear() - adm.getFullYear()) * 12 + (now.getMonth() - adm.getMonth());
  if (months < 1) return 'Menos de 1 mês';
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} ano${years > 1 ? 's' : ''} e ${rem} mês${rem > 1 ? 'es' : ''}` : `${years} ano${years > 1 ? 's' : ''}`;
}

function getAniversario(dataNascimento: string | null): string | null {
  if (!dataNascimento) return null;
  const d = new Date(dataNascimento + 'T12:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

function isAniversarioHoje(dataNascimento: string | null): boolean {
  if (!dataNascimento) return false;
  const d = new Date(dataNascimento + 'T12:00:00');
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
}

function ProfileCard({ profile, vendaCount }: { profile: Profile & { data_nascimento?: string | null; data_admissao?: string | null }; vendaCount: number }) {
  const aniversario = getAniversario((profile as any).data_nascimento);
  const isBirthday = isAniversarioHoje((profile as any).data_nascimento);
  const tempo = calcTempoEmpresa((profile as any).data_admissao);

  return (
    <div className={`bg-card rounded-xl border shadow-card p-5 space-y-3 transition-all hover:shadow-card-hover ${isBirthday ? 'border-warning/50 ring-2 ring-warning/20' : 'border-border/30'}`}>
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 border-2 border-border/30">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {(profile.apelido || profile.nome_completo).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{profile.nome_completo}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {profile.cargo}
          </p>
          {profile.codigo && <p className="text-[10px] text-muted-foreground font-mono">ID: {profile.codigo}</p>}
        </div>
        {isBirthday && <span className="text-2xl">🎂</span>}
      </div>

      <Separator className="bg-border/20" />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{profile.email}</span>
        </div>
        {profile.celular && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span>{profile.celular}</span>
          </div>
        )}
        {aniversario && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Aniversário: {aniversario}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Award className="w-3 h-3 shrink-0" />
          <span>Tempo: {tempo}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Badge variant="outline" className="text-[10px] gap-1">
          <TrendingUp className="w-3 h-3" /> {vendaCount} venda{vendaCount !== 1 ? 's' : ''}
        </Badge>
        {vendaCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Média: {(vendaCount / Math.max(1, calcMonths((profile as any).data_admissao))).toFixed(1)}/mês
          </span>
        )}
      </div>
    </div>
  );
}

function calcMonths(dataAdmissao: string | null): number {
  if (!dataAdmissao) return 1;
  const adm = new Date(dataAdmissao + 'T12:00:00');
  const now = new Date();
  return Math.max(1, (now.getFullYear() - adm.getFullYear()) * 12 + (now.getMonth() - adm.getMonth()));
}

const Equipe = () => {
  const { data: profiles = [], isLoading } = useTeamProfiles();
  const { data: vendaCounts = {} } = useAllVendasCount();
  const [search, setSearch] = useState('');

  const activeProfiles = useMemo(() => {
    return profiles
      .filter(p => !p.disabled)
      .filter(p => {
        if (!search) return true;
        const q = search.toLowerCase();
        return p.nome_completo.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.cargo.toLowerCase().includes(q);
      })
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [profiles, search]);

  // Birthday people first
  const sorted = useMemo(() => {
    const bday = activeProfiles.filter(p => isAniversarioHoje((p as any).data_nascimento));
    const rest = activeProfiles.filter(p => !isAniversarioHoje((p as any).data_nascimento));
    return [...bday, ...rest];
  }, [activeProfiles]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Diretório de colaboradores do Grupo New</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Users className="w-3.5 h-3.5 mr-1.5" /> {activeProfiles.length} colaborador{activeProfiles.length !== 1 ? 'es' : ''}
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, e-mail ou cargo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border/40" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Nenhum colaborador encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(p => (
            <ProfileCard key={p.id} profile={p} vendaCount={vendaCounts[p.id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Equipe;
