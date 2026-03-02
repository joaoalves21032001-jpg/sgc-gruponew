import { useState, useEffect } from 'react';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { useLogAction } from '@/hooks/useAuditLog';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Settings, Shield, Database, Bell, Clock, Save,
    Trash2, Users, Activity, Eye, Lock, Plus, Pencil,
    Check, X, UserPlus, ChevronRight, ShieldCheck
} from 'lucide-react';
import {
    useSecurityProfiles,
    useProfilePermissions,
    useCreateSecurityProfile,
    useUpdateSecurityProfile,
    useDeleteSecurityProfile,
    useTogglePermission,
    useAssignSecurityProfile,
    useProfileUsers,
    RESOURCES,
    ACTIONS,
} from '@/hooks/useSecurityProfiles';

const Configuracoes = () => {
    const { data: role } = useUserRole();
    const { data: profiles = [] } = useTeamProfiles();
    const logAction = useLogAction();
    const queryClient = useQueryClient();

    // Log Retention
    const [retentionMonths, setRetentionMonths] = useState('6');
    const [autoDeleteReadNotifs, setAutoDeleteReadNotifs] = useState(false);
    const [notifRetentionDays, setNotifRetentionDays] = useState('30');
    const [saving, setSaving] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Security Profiles
    const { data: securityProfiles = [], isLoading: spLoading } = useSecurityProfiles();
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const { data: profilePerms = [] } = useProfilePermissions(selectedProfileId);
    const { data: profileUsers = [] } = useProfileUsers(selectedProfileId);
    const createProfile = useCreateSecurityProfile();
    const updateProfile = useUpdateSecurityProfile();
    const deleteProfile = useDeleteSecurityProfile();
    const togglePerm = useTogglePermission();
    const assignProfile = useAssignSecurityProfile();

    // Dialogs
    const [newProfileOpen, setNewProfileOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileDesc, setNewProfileDesc] = useState('');
    const [editingProfile, setEditingProfile] = useState<{ id: string; name: string; description: string } | null>(null);
    const [assignUserOpen, setAssignUserOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const selectedProfile = securityProfiles.find(p => p.id === selectedProfileId);

    // Load settings from system_settings table
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data } = await supabase.from('system_settings' as any).select('key, value');
                if (data) {
                    const settings = data as any[];
                    const retention = settings.find((s: any) => s.key === 'log_retention_months');
                    if (retention) setRetentionMonths(retention.value);
                    const autoDelete = settings.find((s: any) => s.key === 'auto_delete_read_notifs');
                    if (autoDelete) setAutoDeleteReadNotifs(autoDelete.value === 'true');
                    const notifDays = settings.find((s: any) => s.key === 'notif_retention_days');
                    if (notifDays) setNotifRetentionDays(notifDays.value);
                }
            } catch { /* ignore */ }
            setLoadingSettings(false);
        };
        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const settings = [
                { key: 'log_retention_months', value: retentionMonths },
                { key: 'auto_delete_read_notifs', value: String(autoDeleteReadNotifs) },
                { key: 'notif_retention_days', value: notifRetentionDays },
            ];
            for (const s of settings) {
                await supabase.from('system_settings' as any).upsert(s, { onConflict: 'key' });
            }
            logAction('alterar_configuracoes', 'system_settings', undefined, { settings });
            toast.success('Configurações salvas!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleCleanupLogs = async () => {
        if (!confirm('Tem certeza que deseja limpar logs antigos?')) return;
        try {
            const months = parseInt(retentionMonths);
            if (months === 0) {
                toast.info('Retenção ilimitada — nenhum log será excluído.');
                return;
            }
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            const { error } = await supabase.from('audit_logs').delete().lt('created_at', cutoff.toISOString());
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            logAction('limpar_logs', 'audit_logs', undefined, { meses: months });
            toast.success('Logs antigos limpos com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao limpar logs.');
        }
    };

    const handleCleanupNotifs = async () => {
        try {
            const days = parseInt(notifRetentionDays);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const { error } = await supabase.from('notifications').delete().eq('lida', true).lt('created_at', cutoff.toISOString());
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Notificações lidas removidas!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao limpar notificações.');
        }
    };

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) { toast.error('Nome obrigatório.'); return; }
        try {
            await createProfile.mutateAsync({ name: newProfileName.trim(), description: newProfileDesc.trim() || undefined });
            logAction('criar_perfil_seguranca', 'security_profiles', undefined, { name: newProfileName });
            toast.success(`Perfil "${newProfileName}" criado!`);
            setNewProfileOpen(false);
            setNewProfileName('');
            setNewProfileDesc('');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar perfil.');
        }
    };

    const handleUpdateProfile = async () => {
        if (!editingProfile) return;
        try {
            await updateProfile.mutateAsync({ id: editingProfile.id, name: editingProfile.name, description: editingProfile.description });
            logAction('editar_perfil_seguranca', 'security_profiles', editingProfile.id, { name: editingProfile.name });
            toast.success('Perfil atualizado!');
            setEditingProfile(null);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar perfil.');
        }
    };

    const handleDeleteProfile = async () => {
        if (!confirmDeleteId) return;
        try {
            await deleteProfile.mutateAsync(confirmDeleteId);
            logAction('excluir_perfil_seguranca', 'security_profiles', confirmDeleteId);
            toast.success('Perfil excluído!');
            if (selectedProfileId === confirmDeleteId) setSelectedProfileId(null);
            setConfirmDeleteId(null);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir perfil.');
        }
    };

    const handleTogglePerm = (resource: string, action: string) => {
        if (!selectedProfileId) return;
        const existing = profilePerms.find(p => p.resource === resource && p.action === action);
        const newAllowed = !(existing?.allowed ?? false);
        togglePerm.mutate({ profileId: selectedProfileId, resource, action, allowed: newAllowed });
    };

    const isPermAllowed = (resource: string, action: string): boolean => {
        const perm = profilePerms.find(p => p.resource === resource && p.action === action);
        return perm?.allowed ?? false;
    };

    const handleAssignUser = (userId: string) => {
        if (!selectedProfileId) return;
        assignProfile.mutate(
            { userId, profileId: selectedProfileId },
            {
                onSuccess: () => {
                    const userName = profiles.find(p => p.id === userId)?.nome_completo;
                    logAction('vincular_perfil_seguranca', 'security_profiles', selectedProfileId, { user: userName });
                    toast.success(`Usuário vinculado ao perfil!`);
                    setAssignUserOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['security-profile-users', selectedProfileId] });
                },
            }
        );
    };

    const handleRemoveUser = (userId: string) => {
        assignProfile.mutate(
            { userId, profileId: null },
            {
                onSuccess: () => {
                    toast.success('Usuário removido do perfil.');
                    queryClient.invalidateQueries({ queryKey: ['security-profile-users', selectedProfileId] });
                },
            }
        );
    };

    // System stats
    const activeProfiles = profiles.filter(p => !p.disabled).length;
    const disabledProfiles = profiles.filter(p => p.disabled).length;

    if (role !== 'administrador') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-2">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
                    <p className="text-sm text-muted-foreground">Somente administradores podem acessar as configurações.</p>
                </div>
            </div>
        );
    }

    // Users not assigned to the currently selected profile
    const unassignedUsers = profiles.filter(p => !p.disabled && !profileUsers.some(u => (u as any).id === p.id));

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Configurações</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie perfis de segurança e configurações do sistema</p>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card rounded-xl border border-border/30 shadow-card p-4 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{activeProfiles}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usuários Ativos</p>
                </div>
                <div className="bg-card rounded-xl border border-border/30 shadow-card p-4 text-center">
                    <Eye className="w-5 h-5 text-warning mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{disabledProfiles}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Desabilitados</p>
                </div>
                <div className="bg-card rounded-xl border border-border/30 shadow-card p-4 text-center">
                    <ShieldCheck className="w-5 h-5 text-success mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{securityProfiles.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perfis de Segurança</p>
                </div>
                <div className="bg-card rounded-xl border border-border/30 shadow-card p-4 text-center">
                    <Activity className="w-5 h-5 text-info mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{retentionMonths}m</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retenção Logs</p>
                </div>
            </div>

            <Tabs defaultValue="profiles" className="space-y-4">
                <TabsList className="bg-card border border-border/30 shadow-card p-1 h-auto rounded-lg">
                    <TabsTrigger value="profiles" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Shield className="w-4 h-4" /> Perfis de Segurança
                    </TabsTrigger>
                    <TabsTrigger value="system" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Settings className="w-4 h-4" /> Sistema
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════ TAB: PERFIS DE SEGURANÇA ═══════════ */}
                <TabsContent value="profiles" className="space-y-4">
                    <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="text-base font-bold font-display text-foreground">Perfis de Segurança</h2>
                            </div>
                            <Button size="sm" className="gap-1.5 font-semibold shadow-brand" onClick={() => setNewProfileOpen(true)}>
                                <Plus className="w-3.5 h-3.5" /> Novo Perfil
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Crie perfis com permissões granulares e vincule usuários. Inspirado no modelo Zabbix — cada perfil define exatamente o que o usuário pode visualizar, editar e aprovar.
                        </p>

                        {/* Profile list */}
                        {spLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">Carregando perfis...</div>
                        ) : securityProfiles.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhum perfil de segurança criado ainda.</p>
                                <p className="text-xs mt-1">Execute a migration SQL no Supabase para criar os perfis padrão.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {securityProfiles.map(sp => (
                                    <div
                                        key={sp.id}
                                        onClick={() => setSelectedProfileId(sp.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedProfileId === sp.id
                                                ? 'border-primary bg-primary/[0.03] shadow-md ring-1 ring-primary/20'
                                                : 'border-border/30 bg-muted/20 hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className={`w-4 h-4 ${selectedProfileId === sp.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <h3 className="text-sm font-bold text-foreground">{sp.name}</h3>
                                            </div>
                                            {sp.is_system && <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">Sistema</Badge>}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2">{sp.description || 'Sem descrição'}</p>
                                        <div className="flex items-center gap-1 mt-2">
                                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">Clique para gerenciar</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected profile detail panel */}
                    {selectedProfile && (
                        <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-5 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">{selectedProfile.name}</h3>
                                        <p className="text-xs text-muted-foreground">{selectedProfile.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!selectedProfile.is_system && (
                                        <>
                                            <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingProfile({
                                                id: selectedProfile.id,
                                                name: selectedProfile.name,
                                                description: selectedProfile.description || '',
                                            })}>
                                                <Pencil className="w-3 h-3" /> Editar
                                            </Button>
                                            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteId(selectedProfile.id)}>
                                                <Trash2 className="w-3 h-3" /> Excluir
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator className="bg-border/20" />

                            {/* Permission matrix */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-bold text-foreground">Matriz de Permissões</h4>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Defina quais recursos cada ação permite. As alterações são salvas automaticamente.
                                </p>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-border/30">
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[200px]">Recurso</th>
                                                {ACTIONS.map(a => (
                                                    <th key={a.key} className="text-center py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{a.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {RESOURCES.map((res, i) => (
                                                <tr key={res.key} className={`border-b border-border/10 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                    <td className="py-2 px-3 text-sm font-medium text-foreground">{res.label}</td>
                                                    {ACTIONS.map(act => {
                                                        const allowed = isPermAllowed(res.key, act.key);
                                                        return (
                                                            <td key={act.key} className="text-center py-2 px-3">
                                                                <button
                                                                    onClick={() => handleTogglePerm(res.key, act.key)}
                                                                    className={`w-7 h-7 rounded-md border transition-all flex items-center justify-center mx-auto ${allowed
                                                                            ? 'bg-success/15 border-success/30 text-success hover:bg-success/25'
                                                                            : 'bg-muted/30 border-border/30 text-muted-foreground/30 hover:bg-muted/50'
                                                                        }`}
                                                                >
                                                                    {allowed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <Separator className="bg-border/20" />

                            {/* Users assigned to this profile */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-foreground">Usuários Vinculados ({profileUsers.length})</h4>
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setAssignUserOpen(true)}>
                                        <UserPlus className="w-3 h-3" /> Vincular Usuário
                                    </Button>
                                </div>

                                {profileUsers.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-3 text-center">Nenhum usuário vinculado a este perfil.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {profileUsers.map((u: any) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/20">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{u.nome_completo}</p>
                                                    <p className="text-[10px] text-muted-foreground">{u.cargo} · {u.email}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleRemoveUser(u.id)}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ═══════════ TAB: SISTEMA ═══════════ */}
                <TabsContent value="system" className="space-y-4">
                    {/* Log Retention */}
                    <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Retenção de Logs</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Define por quanto tempo os logs de auditoria são mantidos no sistema.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período de Retenção</label>
                                <Select value={retentionMonths} onValueChange={setRetentionMonths}>
                                    <SelectTrigger className="h-10">
                                        <Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3 meses</SelectItem>
                                        <SelectItem value="6">6 meses</SelectItem>
                                        <SelectItem value="12">1 ano</SelectItem>
                                        <SelectItem value="24">2 anos</SelectItem>
                                        <SelectItem value="0">Ilimitado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 flex items-end">
                                <Button variant="destructive" size="sm" className="gap-1.5 font-semibold" onClick={handleCleanupLogs}>
                                    <Trash2 className="w-3.5 h-3.5" /> Limpar Logs Antigos
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Notificações</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Configure a retenção e limpeza automática de notificações lidas.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                                <Switch checked={autoDeleteReadNotifs} onCheckedChange={setAutoDeleteReadNotifs} />
                                <Label className="text-sm text-foreground">Excluir automaticamente notificações lidas</Label>
                                <Badge variant="outline" className="text-[10px] ml-auto">{autoDeleteReadNotifs ? 'Ativo' : 'Inativo'}</Badge>
                            </div>
                            {autoDeleteReadNotifs && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Excluir após (dias)</label>
                                        <Select value={notifRetentionDays} onValueChange={setNotifRetentionDays}>
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="7">7 dias</SelectItem>
                                                <SelectItem value="15">15 dias</SelectItem>
                                                <SelectItem value="30">30 dias</SelectItem>
                                                <SelectItem value="60">60 dias</SelectItem>
                                                <SelectItem value="90">90 dias</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 flex items-end">
                                        <Button variant="outline" size="sm" className="gap-1.5 font-semibold" onClick={handleCleanupNotifs}>
                                            <Trash2 className="w-3.5 h-3.5" /> Limpar Agora
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end">
                        <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 font-semibold shadow-brand px-6">
                            {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Salvando...' : 'Salvar Configurações'}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ═══════════ DIALOG: Criar Perfil ═══════════ */}
            <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Novo Perfil de Segurança</DialogTitle>
                        <DialogDescription>Defina o nome e descrição do perfil. As permissões podem ser configuradas depois.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
                            <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Ex: Consultor Pleno" className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
                            <Textarea value={newProfileDesc} onChange={e => setNewProfileDesc(e.target.value)} placeholder="Descreva as responsabilidades deste perfil..." rows={3} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNewProfileOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProfile} disabled={createProfile.isPending} className="gap-1.5">
                            {createProfile.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                            Criar Perfil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ DIALOG: Editar Perfil ═══════════ */}
            <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Editar Perfil</DialogTitle>
                        <DialogDescription>Altere o nome e descrição do perfil de segurança.</DialogDescription>
                    </DialogHeader>
                    {editingProfile && (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
                                <Input value={editingProfile.name} onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
                                <Textarea value={editingProfile.description} onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })} rows={3} />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateProfile} disabled={updateProfile.isPending} className="gap-1.5">
                            <Save className="w-4 h-4" /> Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ DIALOG: Vincular Usuário ═══════════ */}
            <Dialog open={assignUserOpen} onOpenChange={setAssignUserOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Vincular Usuário</DialogTitle>
                        <DialogDescription>Selecione um usuário para vincular ao perfil "{selectedProfile?.name}".</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
                        {unassignedUsers.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Todos os usuários já estão vinculados a este perfil.</p>
                        ) : (
                            unassignedUsers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/20 hover:bg-muted/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{p.nome_completo}</p>
                                        <p className="text-[10px] text-muted-foreground">{p.cargo} · {p.email}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleAssignUser(p.id)}>
                                        <UserPlus className="w-3 h-3" /> Vincular
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════════ DIALOG: Confirmar exclusão ═══════════ */}
            <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Excluir Perfil</DialogTitle>
                        <DialogDescription>Esta ação é irreversível. Usuários vinculados perderão o perfil de segurança.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteProfile} disabled={deleteProfile.isPending} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Configuracoes;
