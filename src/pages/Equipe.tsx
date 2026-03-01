import { useState, useMemo } from 'react';
import { useTeamProfiles, useUserRole, type Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Search, Users, Mail, Phone, Briefcase, Calendar, Award, TrendingUp,
  ChevronRight, ChevronDown, Plus, Trophy, Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Reusing calc functions
function calcTempoEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const adm = new Date(dataAdmissao + 'T12:00:00');
  const now = new Date();
  const months = (now.getFullYear() - adm.getFullYear()) * 12 + (now.getMonth() - adm.getMonth());
  if (months < 1) return 'Recém-chegado';
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}a ${rem}m` : `${years} ano${years > 1 ? 's' : ''}`;
}

function getAniversario(dataNascimento: string | null): string | null {
  if (!dataNascimento) return null;
  const d = new Date(dataNascimento + 'T12:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

// Premiações Hook
function usePremiacoes(userId: string) {
  return useQuery({
    queryKey: ['premiacoes', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('premiacoes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

function useAddPremiacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, titulo, descricao }: { userId: string, titulo: string, descricao: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('premiacoes').insert({ user_id: userId, titulo, descricao, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes', userId] });
      toast.success('Premiação adicionada!');
    },
    onError: (e) => toast.error(e.message),
  });
}

function useDeletePremiacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('premiacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes'] });
      toast.success('Premiação removida.');
    },
  });
}

/* ═══ SharePoint-style OrgChart Card ═══ */
const OrgCard = ({ profile, isAdmin, salesData, onSelect }: {
  profile: Profile;
  isAdmin: boolean;
  salesData: Record<string, { total: number; month: number }>;
  onSelect: (p: Profile) => void;
}) => {
  const sales = salesData[profile.id] || { total: 0, month: 0 };
  const cargoColor = (() => {
    const c = profile.cargo.toLowerCase();
    if (c.includes('diretor')) return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    if (c.includes('gerente')) return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    if (c.includes('supervisor')) return 'bg-gradient-to-br from-teal-500 to-emerald-600';
    return 'bg-gradient-to-br from-slate-500 to-slate-600';
  })();

  return (
    <button
      onClick={() => onSelect(profile)}
      className="group flex flex-col items-center text-center bg-card rounded-xl border border-border/30 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 p-4 min-w-[180px] max-w-[200px] cursor-pointer"
    >
      <Avatar className="w-14 h-14 border-2 border-border/30 group-hover:border-primary/30 transition-colors shadow-sm">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className={`${cargoColor} text-white font-bold text-lg`}>
          {(profile.apelido || profile.nome_completo).charAt(0)}
        </AvatarFallback>
      </Avatar>
      <p className="text-sm font-bold text-foreground mt-2 truncate w-full">{profile.apelido || profile.nome_completo.split(' ')[0]}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{profile.cargo}</p>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span>Mês: <strong className="text-foreground">{sales.month}</strong></span>
        <span>Total: <strong className="text-foreground">{sales.total}</strong></span>
      </div>
    </button>
  );
};

/* ═══ OrgChart Tree Node (recursive) ═══ */
const OrgTreeNode = ({ profile, profiles, isAdmin, salesData, onSelect, isRoot }: {
  profile: Profile;
  profiles: Profile[];
  isAdmin: boolean;
  salesData: Record<string, { total: number; month: number }>;
  onSelect: (p: Profile) => void;
  isRoot?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);

  // Find direct reports
  const directReports = useMemo(() => {
    const cargo = profile.cargo.toLowerCase();

    if (cargo.includes('diretor')) {
      return profiles.filter(p => {
        const pCargo = p.cargo.toLowerCase();
        return pCargo.includes('gerente') && p.id !== profile.id;
      });
    }
    if (cargo.includes('gerente')) {
      // Supervisors under this gerente
      const supervisors = profiles.filter(p => p.gerente_id === profile.id && p.cargo.toLowerCase().includes('supervisor'));
      // Consultors reporting directly to this gerente (no supervisor assigned)
      const directConsultors = profiles.filter(p =>
        p.gerente_id === profile.id &&
        !p.supervisor_id &&
        !p.cargo.toLowerCase().includes('supervisor') &&
        !p.cargo.toLowerCase().includes('gerente') &&
        !p.cargo.toLowerCase().includes('diretor') &&
        p.id !== profile.id
      );
      return [...supervisors, ...directConsultors];
    }
    if (cargo.includes('supervisor')) {
      return profiles.filter(p => p.supervisor_id === profile.id && p.id !== profile.id);
    }
    return [];
  }, [profile, profiles]);

  const hasChildren = directReports.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* This person's card */}
      <div className="relative">
        <OrgCard profile={profile} isAdmin={isAdmin} salesData={salesData} onSelect={onSelect} />
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-card border border-border/40 shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="flex flex-col items-center mt-4">
          {/* Vertical connector line */}
          <div className="w-px h-6 bg-border/40" />

          {/* Horizontal connector + children */}
          <div className="relative">
            {directReports.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border/40" style={{
                width: `calc(100% - 180px)`,
                minWidth: '40px',
              }} />
            )}
            <div className="flex gap-6 items-start">
              {directReports.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Vertical connector to child */}
                  <div className="w-px h-6 bg-border/40" />
                  <OrgTreeNode
                    profile={child}
                    profiles={profiles}
                    isAdmin={isAdmin}
                    salesData={salesData}
                    onSelect={onSelect}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ Profile Detail Modal ═══ */
const ProfileDetailModal = ({ profile, isAdmin, onClose }: {
  profile: Profile | null;
  isAdmin: boolean;
  onClose: () => void;
}) => {
  const [showAwards, setShowAwards] = useState(false);
  const { data: awards = [] } = usePremiacoes(profile?.id || '');
  const addAward = useAddPremiacao();
  const deleteAward = useDeletePremiacao();
  const [awardTitle, setAwardTitle] = useState('');
  const [awardDesc, setAwardDesc] = useState('');

  if (!profile) return null;

  const handleAddAward = async () => {
    if (!awardTitle.trim()) return;
    await addAward.mutateAsync({ userId: profile.id, titulo: awardTitle, descricao: awardDesc });
    setAwardTitle(''); setAwardDesc('');
  };

  return (
    <Dialog open={!!profile} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-border/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{(profile.apelido || profile.nome_completo).charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span>{profile.nome_completo}</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{profile.cargo}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {profile.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3 h-3 text-primary" /> {profile.email}
              </div>
            )}
            {profile.celular && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="w-3 h-3 text-primary" /> {profile.celular}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3 h-3 text-primary" /> {calcTempoEmpresa((profile as any).data_admissao)} de casa
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Award className="w-3 h-3 text-primary" /> Niver: {getAniversario((profile as any).data_nascimento) || '—'}
            </div>
          </div>

          <Separator className="bg-border/20" />

          {/* Awards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-warning" /> Premiações ({awards.length})
              </p>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {awards.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-3">Nenhuma premiação.</p> : (
                awards.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between p-2 rounded bg-muted/20 border border-border/20">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.titulo}</p>
                      {a.descricao && <p className="text-xs text-muted-foreground">{a.descricao}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    {isAdmin && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteAward.mutate(a.id)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                ))
              )}
            </div>
            {isAdmin && (
              <div className="space-y-2 pt-3 border-t border-border/20 mt-3">
                <Input placeholder="Título da premiação" value={awardTitle} onChange={e => setAwardTitle(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Descrição (opcional)" value={awardDesc} onChange={e => setAwardDesc(e.target.value)} className="h-8 text-xs" />
                <Button onClick={handleAddAward} size="sm" className="w-full h-8 text-xs" disabled={!awardTitle}>Adicionar Premiação</Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ═══ Main Component ═══ */
const Equipe = () => {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: profiles = [], isLoading } = useTeamProfiles();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');

  const { data: vendas = [] } = useQuery({
    queryKey: ['all-sales-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendas').select('user_id, created_at').eq('status', 'aprovado');
      if (error) throw error;
      return data || [];
    }
  });

  const salesData = useMemo(() => {
    const stats: Record<string, { total: number, month: number }> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    vendas.forEach(v => {
      if (!stats[v.user_id]) stats[v.user_id] = { total: 0, month: 0 };
      stats[v.user_id].total++;
      const d = new Date(v.created_at);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        stats[v.user_id].month++;
      }
    });
    return stats;
  }, [vendas]);

  // Filter active profiles
  const activeProfiles = useMemo(() =>
    profiles.filter(p => !p.disabled), [profiles]
  );

  // Build Hierarchy Roots
  const roots = useMemo(() => {
    const filtered = search
      ? activeProfiles.filter(p => p.nome_completo.toLowerCase().includes(search.toLowerCase()) || (p.apelido || '').toLowerCase().includes(search.toLowerCase()))
      : activeProfiles;

    if (search) return filtered.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

    // When not searching, show tree hierarchy
    const hasDiretores = activeProfiles.some(u => u.cargo.toLowerCase().includes('diretor'));
    if (hasDiretores) {
      return activeProfiles.filter(p => p.cargo.toLowerCase().includes('diretor'))
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    }
    const hasGerentes = activeProfiles.some(u => u.cargo.toLowerCase().includes('gerente'));
    if (hasGerentes) {
      return activeProfiles.filter(p => p.cargo.toLowerCase().includes('gerente'))
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    }
    // Fallback: everyone without supervisor
    return activeProfiles.filter(p => !p.supervisor_id && !p.gerente_id)
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [activeProfiles, search]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Organograma e Desempenho</p>
        </div>
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar colaborador..."
            className="pl-9 h-9 border-border/40 text-sm"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-2 bg-card rounded-lg border border-border/30 shadow-sm">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total</p>
          <p className="text-lg font-bold text-foreground">{activeProfiles.length}</p>
        </div>
        {['Diretor', 'Gerente', 'Supervisor', 'Consultor'].map(cargo => {
          const count = activeProfiles.filter(p => p.cargo.toLowerCase().includes(cargo.toLowerCase())).length;
          if (count === 0) return null;
          return (
            <div key={cargo} className="px-3 py-2 bg-card rounded-lg border border-border/30 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{cargo}es</p>
              <p className="text-lg font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : search ? (
        /* Search results: flat grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {roots.map(p => (
            <OrgCard key={p.id} profile={p} isAdmin={isAdmin} salesData={salesData} onSelect={setSelectedProfile} />
          ))}
          {roots.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">Nenhum colaborador encontrado.</p>}
        </div>
      ) : (
        /* Org chart tree */
        <div className="overflow-x-auto pb-6">
          <div className="flex flex-col items-center gap-0 min-w-max px-6">
            {roots.map(root => (
              <OrgTreeNode
                key={root.id}
                profile={root}
                profiles={activeProfiles}
                isAdmin={isAdmin}
                salesData={salesData}
                onSelect={setSelectedProfile}
                isRoot
              />
            ))}
            {roots.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhum colaborador encontrado na hierarquia.</p>}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        isAdmin={isAdmin}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
};

export default Equipe;