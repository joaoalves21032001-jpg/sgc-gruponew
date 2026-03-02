import { useState, useEffect } from 'react';
import { useUserRole, useTeamProfiles } from '@/hooks/useProfile';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { useLogAction } from '@/hooks/useAuditLog';
import { useQueryClient } from '@tanstack/react-query';
import { ALL_TABS, useUserTabPermissions, useSetTabPermission } from '@/hooks/useTabPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Settings, Shield, Database, Bell, Clock, Save,
    Trash2, ToggleLeft, Users, Activity, Eye, Lock
} from 'lucide-react';

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

    // Permissions
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const { data: userPermissions = [], isLoading: permLoading } = useUserTabPermissions(selectedUserId || null);
    const setPermMut = useSetTabPermission();

    // Load settings from system_settings table
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from('system_settings')
                    .select('key, value');
                if (error) {
                    // Table may not exist yet - use defaults
                    console.warn('system_settings not available, using defaults:', error.message);
                    setLoadingSettings(false);
                    return;
                }
                if (data) {
                    for (const row of data) {
                        if (row.key === 'log_retention_months') setRetentionMonths(String(row.value));
                        if (row.key === 'auto_delete_read_notifs') setAutoDeleteReadNotifs(row.value === true || row.value === 'true');
                        if (row.key === 'notif_retention_days') setNotifRetentionDays(String(row.value));
                    }
                }
            } catch (err) {
                console.error('Error loading settings:', err);
            }
            setLoadingSettings(false);
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save each setting as upsert
            const settings = [
                { key: 'log_retention_months', value: parseInt(retentionMonths) || 6 },
                { key: 'auto_delete_read_notifs', value: autoDeleteReadNotifs },
                { key: 'notif_retention_days', value: parseInt(notifRetentionDays) || 30 },
            ];

            for (const s of settings) {
                const { error } = await (supabase as any)
                    .from('system_settings')
                    .upsert({ key: s.key, value: s.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                if (error) throw error;
            }

            logAction('salvar_configuracoes', 'system_settings', undefined, {
                log_retention_months: retentionMonths,
                auto_delete_read_notifs: autoDeleteReadNotifs,
                notif_retention_days: notifRetentionDays,
            });
            toast.success('Configurações salvas com sucesso!');
        } catch (err: any) {
            // If system_settings table doesn't exist, store locally
            if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
                localStorage.setItem('sgc_log_retention', retentionMonths);
                localStorage.setItem('sgc_auto_delete_notifs', String(autoDeleteReadNotifs));
                localStorage.setItem('sgc_notif_retention_days', notifRetentionDays);
                toast.success('Configurações salvas localmente! (tabela system_settings não encontrada)');
            } else {
                toast.error(err.message || 'Erro ao salvar configurações.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Cleanup old logs
    const handleCleanupLogs = async () => {
        if (!confirm(`Tem certeza que deseja excluir logs com mais de ${retentionMonths} meses?`)) return;
        try {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - parseInt(retentionMonths));
            const { error, count } = await (supabase as any)
                .from('audit_logs')
                .delete()
                .lt('created_at', cutoff.toISOString());
            if (error) throw error;
            toast.success(`Logs antigos excluídos com sucesso! ${count || ''}`);
            logAction('limpar_logs_antigos', 'audit_logs', undefined, { meses: retentionMonths });
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        } catch (err: any) {
            toast.error(err.message || 'Erro ao limpar logs.');
        }
    };

    // Cleanup read notifications
    const handleCleanupNotifs = async () => {
        if (!confirm(`Tem certeza que deseja excluir notificações lidas com mais de ${notifRetentionDays} dias?`)) return;
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - parseInt(notifRetentionDays));
            const { error } = await (supabase as any)
                .from('notifications')
                .delete()
                .eq('read', true)
                .lt('created_at', cutoff.toISOString());
            if (error) throw error;
            toast.success('Notificações antigas excluídas!');
            logAction('limpar_notificacoes_antigas', 'notifications', undefined, { dias: notifRetentionDays });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err: any) {
            toast.error(err.message || 'Erro ao limpar notificações.');
        }
    };

    // Stats
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

    return (
        <div className="space-y-6 animate-fade-in-up max-w-3xl">
            <div>
                <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Configurações</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
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
                    <Activity className="w-5 h-5 text-success mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{retentionMonths}m</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retenção Logs</p>
                </div>
                <div className="bg-card rounded-xl border border-border/30 shadow-card p-4 text-center">
                    <Bell className="w-5 h-5 text-info mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{notifRetentionDays}d</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retenção Notif.</p>
                </div>
            </div>

            {/* Log Retention */}
            <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold font-display text-foreground">Retenção de Logs</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                    Define por quanto tempo os logs de auditoria são mantidos no sistema. Logs mais antigos podem ser excluídos manualmente.
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

            {/* Tab Permissions */}
            <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold font-display text-foreground">Permissões de Guias</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                    Controle quais guias cada usuário pode acessar. Guias desabilitadas ficam ocultas no menu lateral.
                </p>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selecionar Usuário</label>
                    <Select value={selectedUserId || '__none__'} onValueChange={v => setSelectedUserId(v === '__none__' ? '' : v)}>
                        <SelectTrigger className="h-10">
                            <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue placeholder="Selecione um usuário..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Selecione um usuário...</SelectItem>
                            {profiles.filter(p => !p.disabled).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.nome_completo} ({p.cargo})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedUserId && (
                    <div className="space-y-2 animate-fade-in-up">
                        {permLoading ? (
                            <div className="text-center py-4 text-muted-foreground text-xs">Carregando permissões...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ALL_TABS.map(tab => {
                                    const perm = userPermissions.find(p => p.tab_key === tab.key);
                                    const isEnabled = perm ? perm.enabled : true; // default: visible
                                    return (
                                        <div key={tab.key} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                                            <Switch
                                                checked={isEnabled}
                                                onCheckedChange={(checked) => {
                                                    setPermMut.mutate({ userId: selectedUserId, tabKey: tab.key, enabled: checked });
                                                    logAction('alterar_permissao_guia', 'user_tab_permissions', selectedUserId, {
                                                        tab: tab.key, enabled: checked,
                                                        usuario: profiles.find(p => p.id === selectedUserId)?.nome_completo,
                                                    });
                                                    toast.success(`${tab.label} ${checked ? 'habilitada' : 'desabilitada'}`);
                                                }}
                                            />
                                            <Label className="text-sm text-foreground flex-1">{tab.label}</Label>
                                            <Badge variant="outline" className={`text-[10px] ${isEnabled ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                                {isEnabled ? 'Visível' : 'Oculta'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2 font-semibold shadow-brand px-6">
                    {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    );
};

export default Configuracoes;
