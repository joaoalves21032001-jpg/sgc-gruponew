import { useState, useMemo } from 'react';
import { useTeamProfiles, type Profile } from '@/hooks/useProfile';
import { useMyPermissions, hasPermission } from '@/hooks/useSecurityProfiles';
import { useCompanhias, type Companhia } from '@/hooks/useInventario';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Search, Users, Mail, Phone, Briefcase, Calendar, Award, TrendingUp,
  ChevronRight, ChevronDown, Plus, Trophy, Trash2, Star, Clock, Cake, Gift
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPatente, PATENTES, type PatenteInfo } from '@/lib/gamification';

// ─── Helpers ───
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

// ─── Premiações Hook ───
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

function useAllPremiacoesCounts() {
  return useQuery({
    queryKey: ['premiacoes-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premiacoes').select('user_id');
      if (error) return {};
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.user_id] = (counts[p.user_id] || 0) + 1;
      });
      return counts;
    },
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
      queryClient.invalidateQueries({ queryKey: ['premiacoes-counts'] });
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
      queryClient.invalidateQueries({ queryKey: ['premiacoes-counts'] });
      toast.success('Premiação removida.');
    },
  });
}

// ─── Company Title Helper ───
interface CompanyTitle {
  companhia: string;
  vendas: number;
  metaTitulo: number;
  atingiu: boolean;
}

function computeCompanyTitle(
  userId: string,
  vendas: any[],
  companhias: Companhia[]
): CompanyTitle | null {
  // Count sales per company for this user
  const salesByCompany: Record<string, number> = {};
  vendas.forEach(v => {
    if (v.user_id !== userId) return;
    let compNome: string | null = null;
    // Try to get companhia_nome from dados_completos or direct field
    if (v.dados_completos) {
      try {
        const dc = typeof v.dados_completos === 'string' ? JSON.parse(v.dados_completos) : v.dados_completos;
        compNome = dc.companhia_nome || null;
      } catch { /* ignore */ }
    }
    if (!compNome && v.companhia_nome) compNome = v.companhia_nome;
    if (compNome) {
      salesByCompany[compNome] = (salesByCompany[compNome] || 0) + 1;
    }
  });

  // Find company with most sales
  let maxComp: string | null = null;
  let maxCount = 0;
  Object.entries(salesByCompany).forEach(([comp, count]) => {
    if (count > maxCount) { maxComp = comp; maxCount = count; }
  });

  if (!maxComp || maxCount === 0) return null;

  // Find meta_titulo for this company
  const companhia = companhias.find(c => c.nome === maxComp);
  const metaTitulo = (companhia as any)?.meta_titulo ?? 10;

  return {
    companhia: maxComp,
    vendas: maxCount,
    metaTitulo,
    atingiu: maxCount >= metaTitulo,
  };
}

/* ═══ OrgCard — Enriched Member Card ═══ */
const OrgCard = ({ profile, canEdit, salesData, companyTitles, patenteData, premiacoesCounts, onSelect }: {
  profile: Profile;
  canEdit: boolean;
  salesData: Record<string, { total: number; month: number }>;
  companyTitles: Record<string, CompanyTitle | null>;
  patenteData: Record<string, PatenteInfo | null>;
  premiacoesCounts: Record<string, number>;
  onSelect: (p: Profile) => void;
}) => {
  const sales = salesData[profile.id] || { total: 0, month: 0 };
  const title = companyTitles[profile.id];
  const patente = patenteData[profile.id];
  const premCount = premiacoesCounts[profile.id] || 0;
  const tempoEmpresa = calcTempoEmpresa((profile as any).data_admissao);
  const aniversario = getAniversario((profile as any).data_nascimento);

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
      className="group flex flex-col items-center text-center bg-card rounded-xl border border-border/30 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 p-4 min-w-[200px] max-w-[220px] cursor-pointer relative"
    >
      {/* Patente badge top-right */}
      {patente && (
        <span className={`absolute top-2 right-2 text-xs font-bold ${patente.textClass} flex items-center gap-0.5`}>
          {patente.icon}
        </span>
      )}

      {/* Avatar */}
      <Avatar className={`w-16 h-16 border-2 ${patente ? patente.borderClass : 'border-border/30'} group-hover:border-primary/30 transition-colors shadow-sm`}>
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className={`${cargoColor} text-white font-bold text-xl`}>
          {(profile.apelido || profile.nome_completo).charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <p className="text-sm font-bold text-foreground mt-2 truncate w-full">{profile.apelido || profile.nome_completo.split(' ')[0]}</p>

      {/* Cargo */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{profile.cargo}</p>

      {/* Company Title */}
      {title && title.atingiu && (
        <Badge variant="outline" className="mt-1.5 text-[9px] font-semibold border-amber-400/50 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20 px-2 py-0.5">
          <Star className="w-2.5 h-2.5 mr-0.5" />
          Especialista {title.companhia}
        </Badge>
      )}

      {/* Patente */}
      {patente && (
        <p className={`text-[10px] font-semibold mt-1 ${patente.textClass}`}>
          {patente.icon} {patente.label}
        </p>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[10px] text-muted-foreground w-full">
        <span className="flex items-center gap-0.5 justify-center">
          <Clock className="w-2.5 h-2.5" /> {tempoEmpresa}
        </span>
        {aniversario && (
          <span className="flex items-center gap-0.5 justify-center">
            <Cake className="w-2.5 h-2.5" /> {aniversario}
          </span>
        )}
        {!aniversario && <span />}
      </div>

      {/* Awards + Sales */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        {premCount > 0 && (
          <span className="flex items-center gap-0.5">
            <Trophy className="w-2.5 h-2.5 text-amber-500" /> {premCount}
          </span>
        )}
        <span>Mês: <strong className="text-foreground">{sales.month}</strong></span>
        <span>Total: <strong className="text-foreground">{sales.total}</strong></span>
      </div>
    </button>
  );
};

/* ═══ OrgChart Tree Node (recursive) ═══ */
const OrgTreeNode = ({ profile, profiles, canEdit, salesData, companyTitles, patenteData, premiacoesCounts, onSelect, isRoot }: {
  profile: Profile;
  profiles: Profile[];
  canEdit: boolean;
  salesData: Record<string, { total: number; month: number }>;
  companyTitles: Record<string, CompanyTitle | null>;
  patenteData: Record<string, PatenteInfo | null>;
  premiacoesCounts: Record<string, number>;
  onSelect: (p: Profile) => void;
  isRoot?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);

  const directReports = useMemo(() => {
    const cargo = profile.cargo.toLowerCase();

    if (cargo.includes('diretor')) {
      return profiles.filter(p => {
        const pCargo = p.cargo.toLowerCase();
        return pCargo.includes('gerente') && p.id !== profile.id;
      });
    }
    if (cargo.includes('gerente')) {
      const supervisors = profiles.filter(p => p.gerente_id === profile.id && p.cargo.toLowerCase().includes('supervisor'));
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
      <div className="relative">
        <OrgCard profile={profile} canEdit={canEdit} salesData={salesData} companyTitles={companyTitles} patenteData={patenteData} premiacoesCounts={premiacoesCounts} onSelect={onSelect} />
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-6 h-6 rounded-full bg-card border border-border/40 shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="flex flex-col items-center mt-4">
          <div className="w-px h-6 bg-border/40" />
          <div className="relative">
            {directReports.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border/40" style={{
                width: `calc(100% - 200px)`,
                minWidth: '40px',
              }} />
            )}
            <div className="flex gap-6 items-start">
              {directReports.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border/40" />
                  <OrgTreeNode
                    profile={child}
                    profiles={profiles}
                    canEdit={canEdit}
                    salesData={salesData}
                    companyTitles={companyTitles}
                    patenteData={patenteData}
                    premiacoesCounts={premiacoesCounts}
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
const ProfileDetailModal = ({ profile, canEdit, salesData, companyTitles, patenteData, onClose }: {
  profile: Profile | null;
  canEdit: boolean;
  salesData: Record<string, { total: number; month: number }>;
  companyTitles: Record<string, CompanyTitle | null>;
  patenteData: Record<string, PatenteInfo | null>;
  onClose: () => void;
}) => {
  const [showAwards, setShowAwards] = useState(false);
  const { data: awards = [] } = usePremiacoes(profile?.id || '');
  const addAward = useAddPremiacao();
  const deleteAward = useDeletePremiacao();
  const [awardTitle, setAwardTitle] = useState('');
  const [awardDesc, setAwardDesc] = useState('');

  if (!profile) return null;

  const sales = salesData[profile.id] || { total: 0, month: 0 };
  const title = companyTitles[profile.id];
  const patente = patenteData[profile.id];

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
            <Avatar className={`w-12 h-12 border-2 ${patente ? patente.borderClass : 'border-border/30'}`}>
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{(profile.apelido || profile.nome_completo).charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span>{profile.nome_completo}</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{profile.cargo}</p>
              {patente && (
                <p className={`text-[11px] font-semibold ${patente.textClass}`}>{patente.icon} {patente.label}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Company Title */}
          {title && title.atingiu && (
            <Badge className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-300/40 text-xs">
              <Star className="w-3 h-3 mr-1" /> Especialista em {title.companhia} ({title.vendas} vendas)
            </Badge>
          )}
          {title && !title.atingiu && (
            <p className="text-xs text-muted-foreground">
              Mais vendas em <strong>{title.companhia}</strong>: {title.vendas}/{title.metaTitulo} p/ título
            </p>
          )}

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
              <Clock className="w-3 h-3 text-primary" /> {calcTempoEmpresa((profile as any).data_admissao)} de casa
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cake className="w-3 h-3 text-primary" /> Niver: {getAniversario((profile as any).data_nascimento) || '—'}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-primary" /> Mês: {sales.month} · Total: {sales.total}
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
                    {canEdit && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteAward.mutate(a.id)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                ))
              )}
            </div>
            {canEdit && (
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
  const { data: myPermissions } = useMyPermissions();
  const canEdit = hasPermission(myPermissions, 'equipe', 'edit');
  const { data: profiles = [], isLoading } = useTeamProfiles();
  const { data: companhias = [] } = useCompanhias();
  const { data: premiacoesCounts = {} } = useAllPremiacoesCounts();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');

  // Fetch all approved vendas with dados_completos for company title computation
  const { data: vendas = [] } = useQuery({
    queryKey: ['all-sales-equipe'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendas').select('user_id, created_at, dados_completos, companhia_nome').eq('status', 'aprovado');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch atividades for patente calculation (meta faturamento %)
  const { data: atividades = [] } = useQuery({
    queryKey: ['all-atividades-equipe'],
    queryFn: async () => {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const { data, error } = await supabase.from('atividades').select('user_id, cotacoes_fechadas').gte('data', firstOfMonth);
      if (error) return [];
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

  // Compute company titles for all users
  const companyTitles = useMemo(() => {
    const titles: Record<string, CompanyTitle | null> = {};
    profiles.forEach(p => {
      titles[p.id] = computeCompanyTitle(p.id, vendas, companhias);
    });
    return titles;
  }, [profiles, vendas, companhias]);

  // Compute patente for each user based on % of meta_faturamento
  const patenteData = useMemo(() => {
    const patentes: Record<string, PatenteInfo | null> = {};
    profiles.forEach(p => {
      const meta = p.meta_faturamento || 0;
      if (meta <= 0) { patentes[p.id] = null; return; }
      // Sum cotacoes_fechadas for this month
      const userAtividades = atividades.filter((a: any) => a.user_id === p.id);
      const totalFechadas = userAtividades.reduce((sum: number, a: any) => sum + (a.cotacoes_fechadas || 0), 0);
      const percent = (totalFechadas / meta) * 100;
      patentes[p.id] = getPatente(percent);
    });
    return patentes;
  }, [profiles, atividades]);

  // Filter active profiles
  const activeProfiles = useMemo(() =>
    profiles.filter(p => !p.disabled), [profiles]
  );

  // Build Hierarchy Roots — ALL users should see the same tree
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
      // Start from gerentes — they form the top of the hierarchy
      const gerentes = activeProfiles.filter(p => p.cargo.toLowerCase().includes('gerente'))
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

      // Also find orphaned users (not under any gerente/supervisor and not a gerente)
      const orphans = activeProfiles.filter(p =>
        !p.cargo.toLowerCase().includes('gerente') &&
        !p.cargo.toLowerCase().includes('diretor') &&
        !p.gerente_id &&
        !p.supervisor_id
      );

      return [...gerentes, ...orphans];
    }
    // Fallback: everyone
    return activeProfiles.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
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
            <OrgCard key={p.id} profile={p} canEdit={canEdit} salesData={salesData} companyTitles={companyTitles} patenteData={patenteData} premiacoesCounts={premiacoesCounts} onSelect={setSelectedProfile} />
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
                canEdit={canEdit}
                salesData={salesData}
                companyTitles={companyTitles}
                patenteData={patenteData}
                premiacoesCounts={premiacoesCounts}
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
        canEdit={canEdit}
        salesData={salesData}
        companyTitles={companyTitles}
        patenteData={patenteData}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
};

export default Equipe;