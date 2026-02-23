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

// Node Component for Tree
const TreeNode = ({ profile, profiles, level, isAdmin, salesData }: { profile: Profile, profiles: Profile[], level: number, isAdmin: boolean, salesData: any }) => {
  const [expanded, setExpanded] = useState(true);
  const [showAwards, setShowAwards] = useState(false);
  const { data: awards = [] } = usePremiacoes(profile.id);
  const addAward = useAddPremiacao();
  const deleteAward = useDeletePremiacao();
  const [awardTitle, setAwardTitle] = useState('');
  const [awardDesc, setAwardDesc] = useState('');

  // Find direct reports
  const directReports = useMemo(() => {
    const cargo = profile.cargo.toLowerCase();
    
    if (cargo.includes('diretor')) {
      // Diretores see Gerentes (those without a supervisor link to another diretor)
      return profiles.filter(p => {
        const pCargo = p.cargo.toLowerCase();
        return pCargo.includes('gerente') && p.id !== profile.id;
      });
    }
    if (cargo.includes('gerente')) {
      // Gerentes see Supervisors under them
      return profiles.filter(p => p.gerente_id === profile.id && p.cargo.toLowerCase().includes('supervisor'));
    }
    if (cargo.includes('supervisor')) {
      // Supervisors see Consultors under them
      return profiles.filter(p => p.supervisor_id === profile.id);
    }
    return [];
  }, [profile, profiles]);

  // Special handling for top level (Diretor) or unlinked Gerentes done in parent.
  
  const hasChildren = directReports.length > 0;
  const sales = salesData[profile.id] || { total: 0, month: 0 };
  
  const handleAddAward = async () => {
    if (!awardTitle.trim()) return;
    await addAward.mutateAsync({ userId: profile.id, titulo: awardTitle, descricao: awardDesc });
    setAwardTitle(''); setAwardDesc('');
  };

  return (
    <div className="ml-4 border-l border-border/20 pl-4 py-2">
      <div className="bg-card rounded-lg border border-border/30 shadow-sm p-3 flex items-center gap-3 w-full max-w-3xl hover:border-primary/30 transition-colors">
        <button onClick={() => setExpanded(!expanded)} className={`p-1 rounded-md hover:bg-muted ${hasChildren ? '' : 'invisible'}`}>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        
        <Avatar className="w-10 h-10 border border-border/30">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{(profile.apelido || profile.nome_completo).charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-1">
            <p className="text-sm font-bold text-foreground truncate">{profile.nome_completo}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile.cargo}</p>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {calcTempoEmpresa((profile as any).data_admissao)} de casa</div>
            <div className="flex items-center gap-1.5"><Award className="w-3 h-3" /> Niver: {getAniversario((profile as any).data_nascimento) || '—'}</div>
          </div>

          <div className="text-xs space-y-0.5">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Vendas Mês:</span> <span className="font-bold text-foreground">{sales.month}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Vendas Total:</span> <span className="font-bold text-foreground">{sales.total}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary" onClick={() => setShowAwards(true)}>
              <Trophy className="w-3.5 h-3.5" /> Premiações ({awards.length})
            </Button>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="animate-fade-in">
          {directReports.map(child => (
            <TreeNode key={child.id} profile={child} profiles={profiles} level={level + 1} isAdmin={isAdmin} salesData={salesData} />
          ))}
        </div>
      )}

      <Dialog open={showAwards} onOpenChange={setShowAwards}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Premiações de {profile.apelido}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {awards.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma premiação.</p> : (
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
              <div className="space-y-2 pt-4 border-t border-border/20">
                <Input placeholder="Título da premiação" value={awardTitle} onChange={e => setAwardTitle(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Descrição (opcional)" value={awardDesc} onChange={e => setAwardDesc(e.target.value)} className="h-8 text-xs" />
                <Button onClick={handleAddAward} size="sm" className="w-full h-8 text-xs" disabled={!awardTitle}>Adicionar Premiação</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Equipe = () => {
  const { data: role } = useUserRole();
  const isAdmin = role === 'administrador';
  const { data: profiles = [], isLoading } = useTeamProfiles();
  
  // Mock sales data or fetch real
  // In real app, we should fetch from 'vendas' table with aggregations.
  // For now I'll create a quick query or just use useAllVendasCount logic but enhanced
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

  // Build Hierarchy Roots
  // Roots are: 
  // 1. Diretores (anyone with cargo 'Diretor')
  // 2. Gerentes who have no linked supervisor (assuming they report to directors or are top)
  // 3. Anyone else who has no supervisor_id AND no gerente_id (Orphans/Top level)
  const roots = useMemo(() => {
    return profiles.filter(p => {
      const cargo = p.cargo.toLowerCase();
      // If Diretor -> Root
      if (cargo.includes('diretor')) return true;
      // If Gerente and no Director link (we don't have director_id, so usually root)
      // But we need to check if they are already children of someone else? 
      // In this simple schema, Gerentes don't have 'supervisor_id' usually pointing to another manager.
      // So Gerentes are likely roots unless we have Diretores.
      // Let's assume all Gerentes and Diretores are roots for the visualization,
      // UNLESS we want a single tree.
      // Let's try: Roots = All Diretores. If no Diretores, then all Gerentes.
      
      const hasDiretores = profiles.some(u => u.cargo.toLowerCase().includes('diretor'));
      if (hasDiretores) {
        return cargo.includes('diretor');
      }
      // If no diretores, maybe Gerentes are top
      const hasGerentes = profiles.some(u => u.cargo.toLowerCase().includes('gerente'));
      if (hasGerentes) {
        return cargo.includes('gerente');
      }
      // Fallback: everyone without supervisor
      return !p.supervisor_id && !p.gerente_id;
    }).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [profiles]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Organograma e Desempenho</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="space-y-2">
          {roots.map(root => (
            <TreeNode key={root.id} profile={root} profiles={profiles} level={0} isAdmin={isAdmin} salesData={salesData} />
          ))}
          {roots.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhum colaborador encontrado na hierarquia.</p>}
        </div>
      )}
    </div>
  );
};

export default Equipe;