import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { validatePasswordComplexity } from '@/lib/password';
import { useUserRole, useTeamProfiles, useProfile } from '@/hooks/useProfile';
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
    Check, X, UserPlus, ChevronRight, ShieldCheck, ChevronDown, AlertTriangle, BrainCircuit, Sparkles, History, Loader2, RefreshCw, Cpu, ShieldAlert, ShieldOff, Unlock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    useSecurityProfiles,
    useProfilePermissions,
    useCreateSecurityProfile,
    useUpdateSecurityProfile,
    useDeleteSecurityProfile,
    useTogglePermission,
    useAssignSecurityProfileToCargo,
    useProfileCargos,
    useMyPermissions,
    useBulkSetPermissions,
    hasPermission,
    MODULES_DEF,
    SUPER_ADMIN_PROFILE_NAME,
    type ActionDef,
    type ResourceGroupDef,
} from '@/hooks/useSecurityProfiles';
import {
    useNotificationRules,
    useToggleNotificationRule,
    useUpdateRuleAudiences,
    useCreateNotificationRule,
    useDeleteNotificationRule,
    AUDIENCES,
    EVENTS,
    type NotificationRule,
} from '@/hooks/useNotificationRules';
import {
    useCargos,
    useCargoPermissions,
    useCreateCargo,
    useUpdateCargo,
    useDeleteCargo,
    useToggleCargoPermission,
    useBulkSetCargoPermissions,
    CARGO_MODULES_DEF
} from '@/hooks/useCargos';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    useAuditLogConfig,
    useToggleAuditLogEvent,
    useCreateAuditLogEvent,
    useDeleteAuditLogEvent,
    AUDIT_CATEGORIES,
    type AuditLogConfig,
} from '@/hooks/useAuditLogConfig';
import { useKnowledgeBase, useCreateKnowledge, useDeleteKnowledge, useAnalyzeSystem } from '@/hooks/useKnowledgeBase';
import { useStarkWatchdog, useUpdateStarkErrorStatus } from '@/hooks/useStarkWatchdog';
import { AdminProtectionDialog } from '@/components/AdminProtectionDialog';

const Configuracoes = () => {
    const { data: role } = useUserRole();
    const { data: profiles = [] } = useTeamProfiles();
    const { data: profile } = useProfile();
    const logAction = useLogAction();
    const queryClient = useQueryClient();
    const { data: myPagePermissions } = useMyPermissions();

    // Log Retention
    const [retentionMonths, setRetentionMonths] = useState('6');
    const [autoDeleteReadNotifs, setAutoDeleteReadNotifs] = useState(false);
    const [notifRetentionDays, setNotifRetentionDays] = useState('30');
    const [saving, setSaving] = useState(false);

    // Security Profiles
    const { data: securityProfiles = [], isLoading: spLoading } = useSecurityProfiles();
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const { data: profilePerms = [] } = useProfilePermissions(selectedProfileId);
    const { data: profileCargos = [] } = useProfileCargos(selectedProfileId);
    const createProfile = useCreateSecurityProfile();
    const updateProfile = useUpdateSecurityProfile();
    const deleteProfile = useDeleteSecurityProfile();
    const togglePerm = useTogglePermission();
    const bulkSetPerms = useBulkSetPermissions();
    const assignProfileToCargo = useAssignSecurityProfileToCargo();

    const toggleAllPermissions = (enable: boolean) => {
        if (!selectedProfileId) return;
        const sp = securityProfiles.find(p => p.id === selectedProfileId);
        
        const performToggle = () => {
            const allPerms: { resource: string; action: string; allowed: boolean }[] = [];
            MODULES_DEF.forEach(group => {
                group.resources.forEach(res => {
                    res.actions.forEach(act => {
                        allPerms.push({ resource: res.key, action: act.key, allowed: enable });
                    });
                });
            });
            bulkSetPerms.mutate({ profileId: selectedProfileId, permissions: allPerms });
            toast.success(enable ? 'Todas as permissões ativadas!' : 'Todas as permissões desativadas!');
        };

        if (sp?.is_protected) {
            requireAdminAuth(selectedProfileId, sp.name || '', performToggle, {
                passwordHash: sp.protection_password,
                mfaSecret: sp.protection_mfa_secret
            });
        } else {
            performToggle();
        }
    };

    const toggleGroupPermissions = (groupKey: string, enable: boolean) => {
        if (!selectedProfileId) return;
        const sp = securityProfiles.find(p => p.id === selectedProfileId);
        const group = MODULES_DEF.find(g => g.groupLabel === groupKey);
        if (!group) return;

        const performToggle = () => {
            const groupPerms: { resource: string; action: string; allowed: boolean }[] = [];
            group.resources.forEach(res => {
                res.actions.forEach(act => {
                    groupPerms.push({ resource: res.key, action: act.key, allowed: enable });
                });
            });
            bulkSetPerms.mutate({ profileId: selectedProfileId, permissions: groupPerms });
            toast.success(enable ? `Bloco "${groupKey}" ativado!` : `Bloco "${groupKey}" desativado!`);
        };

        if (sp?.is_protected) {
            requireAdminAuth(selectedProfileId, sp.name || '', performToggle, {
                passwordHash: sp.protection_password,
                mfaSecret: sp.protection_mfa_secret
            });
        } else {
            performToggle();
        }
    };

    // Cargos
    const { data: cargos = [], isLoading: cargosLoading } = useCargos();
    const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
    const { data: cargoPerms = [] } = useCargoPermissions(selectedCargoId);
    const createCargo = useCreateCargo();
    const updateCargo = useUpdateCargo();
    const deleteCargo = useDeleteCargo();
    const toggleCargoPerm = useToggleCargoPermission();
    const bulkSetCargoPerms = useBulkSetCargoPermissions();

    const toggleAllCargoPermissions = (enable: boolean) => {
        if (!selectedCargoId) return;
        const cargo = cargos.find((c: any) => c.id === selectedCargoId);

        const performToggle = () => {
            const allPerms: { resource: string; action: string; allowed: boolean }[] = [];
            CARGO_MODULES_DEF.forEach(group => {
                group.resources.forEach(res => {
                    res.actions.forEach(act => {
                        allPerms.push({ resource: res.key, action: act.key, allowed: enable });
                    });
                });
            });
            bulkSetCargoPerms.mutate({ cargoId: selectedCargoId, permissions: allPerms });
            toast.success(enable ? 'Todas as permissões do cargo ativadas!' : 'Todas as permissões do cargo desativadas!');
        };

        if (cargo?.is_protected) {
            requireAdminAuth(cargo.id, cargo.nome, performToggle, {
                passwordHash: (cargo as any).protection_password,
                mfaSecret: (cargo as any).protection_mfa_secret
            });
        } else {
            performToggle();
        }
    };

    const toggleCargoGroupPermissions = (groupKey: string, enable: boolean) => {
        if (!selectedCargoId) return;
        const cargo = cargos.find((c: any) => c.id === selectedCargoId);
        const group = CARGO_MODULES_DEF.find(g => g.groupLabel === groupKey);
        if (!group) return;

        const performToggle = () => {
            const groupPerms: { resource: string; action: string; allowed: boolean }[] = [];
            group.resources.forEach(res => {
                res.actions.forEach(act => {
                    groupPerms.push({ resource: res.key, action: act.key, allowed: enable });
                });
            });
            bulkSetCargoPerms.mutate({ cargoId: selectedCargoId, permissions: groupPerms });
            toast.success(enable ? `Bloco "${groupKey}" ativado!` : `Bloco "${groupKey}" desativado!`);
        };

        if (cargo?.is_protected) {
            requireAdminAuth(cargo.id, cargo.nome, performToggle, {
                passwordHash: (cargo as any).protection_password,
                mfaSecret: (cargo as any).protection_mfa_secret
            });
        } else {
            performToggle();
        }
    };

    const [newCargoOpen, setNewCargoOpen] = useState(false);
    const [newCargoNome, setNewCargoNome] = useState('');
    const [newCargoDesc, setNewCargoDesc] = useState('');
    const [newCargoRequiresLeader, setNewCargoRequiresLeader] = useState(true);
    const [editingCargo, setEditingCargo] = useState<{ id: string; nome: string; description: string; requires_leader: boolean; is_protected?: boolean } | null>(null);

    const [adminProtectionDialog, setAdminProtectionDialog] = useState<{
        open: boolean;
        targetName?: string;
        customProtection?: { passwordHash?: string | null; mfaSecret?: string | null };
        onUnlocked: () => void;
    }>({ open: false, onUnlocked: () => {} });

    const requireAdminAuth = (id: string, targetName: string, onUnlocked: () => void, customProtection?: { passwordHash?: string | null; mfaSecret?: string | null }) => {
        // Check if there is an active session for this specific resource (profile/cargo)
        if (unlockedSession && unlockedSession.id === id && Date.now() < unlockedSession.until) {
            onUnlocked();
            return;
        }

        const handleSuccess = () => {
            // Create a session valid for 5 minutes
            setUnlockedSession({ id, until: Date.now() + 5 * 60 * 1000 });
            onUnlocked();
        };

        setAdminProtectionDialog({ open: true, targetName, customProtection, onUnlocked: handleSuccess });
    };
    const [confirmDeleteCargoId, setConfirmDeleteCargoId] = useState<string | null>(null);
    const [expandedCargoResources, setExpandedCargoResources] = useState<Set<string>>(new Set());

    // Notification Rules
    const { data: notifRules = [], isLoading: nrLoading } = useNotificationRules();
    const toggleRule = useToggleNotificationRule();
    const updateAudiences = useUpdateRuleAudiences();
    const createRule = useCreateNotificationRule();
    const deleteRule = useDeleteNotificationRule();

    // Notification Dialogs
    const [newRuleOpen, setNewRuleOpen] = useState(false);
    const [newRuleEvent, setNewRuleEvent] = useState('');
    const [newRuleLabel, setNewRuleLabel] = useState('');
    const [newRuleAudiences, setNewRuleAudiences] = useState<string[]>([]);

    const [editingRule, setEditingRule] = useState<{ id: string; event_label: string } | null>(null);
    const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);

    // Audit Log Config
    const { data: auditLogConfig = [], isLoading: alLoading } = useAuditLogConfig();
    const toggleAuditEvent = useToggleAuditLogEvent();
    const createAuditEvent = useCreateAuditLogEvent();
    const deleteAuditEvent = useDeleteAuditLogEvent();

    const [newEventOpen, setNewEventOpen] = useState(false);
    const [newEventKey, setNewEventKey] = useState('');
    const [newEventLabel, setNewEventLabel] = useState('');
    const [newEventCategory, setNewEventCategory] = useState('geral');
    const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
    const [unlockedSession, setUnlockedSession] = useState<{ id: string; until: number } | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Effect for the countdown timer
    useEffect(() => {
        if (!unlockedSession) return;
        const interval = setInterval(() => {
            const now = Date.now();
            setCurrentTime(now);
            if (now >= unlockedSession.until) {
                setUnlockedSession(null);
                toast.info('Sessão expirada. O item foi bloqueado automaticamente por segurança.');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [unlockedSession]);

    const formatTimeLeft = (until: number) => {
        const seconds = Math.max(0, Math.floor((until - Date.now()) / 1000));
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinalizeSession = () => {
        setUnlockedSession(null);
        toast.success('Edição finalizada! Todas as alterações foram salvas com sucesso.');
    };

    // Dialogs
    const [cleanupLogsOpen, setCleanupLogsOpen] = useState(false);
    const [cleanupLogsPeriod, setCleanupLogsPeriod] = useState('all');
    const [cleanupNotifsOpen, setCleanupNotifsOpen] = useState(false);
    const [cleanupNotifsPeriod, setCleanupNotifsPeriod] = useState('all_read');

    const [newProfileOpen, setNewProfileOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileDesc, setNewProfileDesc] = useState('');
    const [editingProfile, setEditingProfile] = useState<{ 
        id: string; 
        name: string; 
        description: string;
        is_system?: boolean;
        is_protected?: boolean;
        protection_password?: string | null;
        protection_mfa_secret?: string | null;
        new_protection_password?: string;
        new_protection_mfa_secret?: string;
    } | null>(null);
    const [assignCargoOpen, setAssignCargoOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

    // Knowledge Base Control
    const { data: knowledgeItems = [], isLoading: kbLoading } = useKnowledgeBase();
    const createKb = useCreateKnowledge();
    const deleteKb = useDeleteKnowledge();
    const analyzeSystem = useAnalyzeSystem();
    const [newKbOpen, setNewKbOpen] = useState(false);
    const [newKbContent, setNewKbContent] = useState('');
    const [newKbCategoria, setNewKbCategoria] = useState('geral');
    const [confirmDeleteKbId, setConfirmDeleteKbId] = useState<string | null>(null);

    // Stark Watchdog State
    const { data: starkErrors, isLoading: isStarkLoading } = useStarkWatchdog();
    const updateStarkStatus = useUpdateStarkErrorStatus();

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
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        try {
            let cutoff = new Date();
            
            if (cleanupLogsPeriod === '1_month') {
                cutoff.setMonth(cutoff.getMonth() - 1);
            } else if (cleanupLogsPeriod === '3_months') {
                cutoff.setMonth(cutoff.getMonth() - 3);
            } else if (cleanupLogsPeriod === '6_months') {
                cutoff.setMonth(cutoff.getMonth() - 6);
            } else if (cleanupLogsPeriod === '1_year') {
                cutoff.setFullYear(cutoff.getFullYear() - 1);
            } else if (cleanupLogsPeriod === 'all') {
                // Delete everything
                const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;
                
                queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
                logAction('limpar_logs_manual', 'audit_logs', undefined, { periodo: 'Todos' });
                toast.success('Todos os logs foram removidos!');
                setCleanupLogsOpen(false);
                return;
            }

            const { error } = await supabase.from('audit_logs').delete().lt('created_at', cutoff.toISOString());
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            logAction('limpar_logs_manual', 'audit_logs', undefined, { periodo_corte: cleanupLogsPeriod });
            toast.success('Logs removidos com sucesso!');
            setCleanupLogsOpen(false);
        } catch (err: any) { 
            toast.error(err.message || 'Erro ao limpar logs.'); 
        }
    };

    const handleCleanupNotifs = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        try {
            let cutoff = new Date();
            let query = supabase.from('notifications').delete().eq('lida', true);

            if (cleanupNotifsPeriod === '7_days') {
                cutoff.setDate(cutoff.getDate() - 7);
                query = query.lt('created_at', cutoff.toISOString());
            } else if (cleanupNotifsPeriod === '15_days') {
                cutoff.setDate(cutoff.getDate() - 15);
                query = query.lt('created_at', cutoff.toISOString());
            } else if (cleanupNotifsPeriod === '30_days') {
                cutoff.setDate(cutoff.getDate() - 30);
                query = query.lt('created_at', cutoff.toISOString());
            }

            const { error } = await query;
            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Notificações removidas com sucesso!');
            setCleanupNotifsOpen(false);
        } catch (err: any) { 
            toast.error(err.message || 'Erro ao limpar notificações.'); 
        }
    };

    const handleCreateRule = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!newRuleEvent.trim() || !newRuleLabel.trim() || newRuleAudiences.length === 0) {
            toast.error('Preencha os campos obrigatórios (Evento, Label e ao menos um Público).');
            return;
        }
        try {
            await createRule.mutateAsync({
                event_key: newRuleEvent.trim(),
                event_label: newRuleLabel.trim(),
                audiences: newRuleAudiences,
                enabled: true
            });
            logAction('criar_regra_notificacao', 'notification_rules', undefined, { event: newRuleEvent });
            toast.success('Regra criada com sucesso!');
            setNewRuleOpen(false);
            setNewRuleEvent('');
            setNewRuleLabel('');
            setNewRuleAudiences([]);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar regra.');
        }
    };

    const handleDeleteRule = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!confirmDeleteRuleId) return;
        try {
            await deleteRule.mutateAsync(confirmDeleteRuleId);
            logAction('excluir_regra_notificacao', 'notification_rules', confirmDeleteRuleId);
            toast.success('Regra excluída!');
            setConfirmDeleteRuleId(null);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCreateAuditEvent = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!newEventKey.trim() || !newEventLabel.trim()) {
            toast.error('Chave e Label são obrigatórios.');
            return;
        }
        try {
            await createAuditEvent.mutateAsync({
                event_key: newEventKey.trim().toLowerCase().replace(/\s+/g, '_'),
                event_label: newEventLabel.trim(),
                category: newEventCategory,
                enabled: true,
            });
            logAction('criar_evento_log', 'audit_log_config', undefined, { key: newEventKey });
            toast.success('Evento criado com sucesso!');
            setNewEventOpen(false);
            setNewEventKey('');
            setNewEventLabel('');
            setNewEventCategory('geral');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar evento.');
        }
    };

    const handleDeleteAuditEvent = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!confirmDeleteEventId) return;
        try {
            await deleteAuditEvent.mutateAsync(confirmDeleteEventId);
            logAction('excluir_evento_log', 'audit_log_config', confirmDeleteEventId);
            toast.success('Evento removido!');
            setConfirmDeleteEventId(null);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCreateProfile = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.permissoes', 'edit')) {
            toast.error('Seu cargo não permite criar perfis de segurança.');
            return;
        }
        if (!newProfileName.trim()) { toast.error('Nome obrigatório.'); return; }
        try {
            const result = await createProfile.mutateAsync({ name: newProfileName.trim(), description: newProfileDesc.trim() || undefined });
            logAction('criar_perfil_seguranca', 'security_profiles', undefined, { name: newProfileName });
            toast.success(`Perfil "${newProfileName}" criado!`);
            setNewProfileOpen(false);
            setNewProfileName('');
            setNewProfileDesc('');
            setSelectedProfileId(result.id);
        } catch (err: any) {
            if (err.message?.includes('schema cache')) {
                toast.error('Tabela security_profiles não encontrada. Execute a migration SQL no Supabase Dashboard.');
            } else {
                toast.error(err.message || 'Erro ao criar perfil.');
            }
        }
    };

    const handleUpdateProfile = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.permissoes', 'edit')) {
            toast.error('Seu cargo não permite editar perfis de segurança.');
            return;
        }
        if (!editingProfile) return;
        try {
            let passwordToSave = editingProfile.protection_password;
            
            if (editingProfile.new_protection_password) {
                const pwdCheck = validatePasswordComplexity(editingProfile.new_protection_password);
                if (!pwdCheck.isValid) {
                    toast.error(`Na senha de proteção: ${pwdCheck.message}`);
                    return;
                }
                const encoder = new TextEncoder();
                const data = encoder.encode(editingProfile.new_protection_password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                passwordToSave = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }

            await updateProfile.mutateAsync({ 
                id: editingProfile.id, 
                name: editingProfile.name, 
                description: editingProfile.description,
                is_protected: !!(editingProfile.is_protected),
                protection_password: passwordToSave,
                protection_mfa_secret: editingProfile.new_protection_mfa_secret || editingProfile.protection_mfa_secret
            });
            
            logAction('editar_perfil_seguranca', 'security_profiles', editingProfile.id);
            toast.success('Perfil atualizado!');
            setEditingProfile(null);
        } catch (err: any) { toast.error(err.message); }
    };


    const handleDeleteProfile = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.permissoes', 'edit')) {
            toast.error('Seu cargo não permite excluir perfis de segurança.');
            return;
        }
        if (!confirmDeleteId) return;

        const sp = securityProfiles.find(p => p.id === confirmDeleteId);
        
        const performDelete = async () => {
            try {
                await deleteProfile.mutateAsync(confirmDeleteId);
                logAction('excluir_perfil_seguranca', 'security_profiles', confirmDeleteId);
                toast.success('Perfil excluído!');
                if (selectedProfileId === confirmDeleteId) setSelectedProfileId(null);
                setConfirmDeleteId(null);
            } catch (err: any) { toast.error(err.message); }
        };

        if (sp?.is_protected) {
            requireAdminAuth(sp.id, sp.name, performDelete, {
                passwordHash: sp.protection_password,
                mfaSecret: sp.protection_mfa_secret
            });
        } else {
            performDelete();
        }
    };

    const handleTogglePerm = (resource: string, action: string) => {
        if (!selectedProfileId) return;
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.permissoes', 'edit')) {
            toast.error('Seu cargo não permite alterar permissões de perfis.');
            return;
        }
        
        const sp = securityProfiles.find(p => p.id === selectedProfileId);
        const existing = profilePerms.find(p => p.resource === resource && p.action === action);
        const newAllowed = !(existing?.allowed ?? false);

        const performToggle = () => {
            togglePerm.mutate({ profileId: selectedProfileId, resource, action, allowed: newAllowed });
        };

        if (sp?.is_protected) {
            requireAdminAuth(
                sp.id,
                sp.name || '', 
                performToggle, 
                { 
                    passwordHash: sp?.protection_password,
                    mfaSecret: sp?.protection_mfa_secret
                }
            );
            return;
        }
        
        performToggle();
    };

    const handleCreateCargo = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.cargos', 'edit')) {
            toast.error('Seu cargo não permite criar novos cargos.');
            return;
        }
        if (!newCargoNome.trim()) { toast.error('Nome obrigatório.'); return; }
        try {
            const result = await createCargo.mutateAsync({ 
                nome: newCargoNome.trim(), 
                description: newCargoDesc.trim() || undefined,
                requires_leader: newCargoRequiresLeader 
            });
            logAction('criar_cargo', 'cargos', undefined, { nome: newCargoNome });
            toast.success(`Cargo "${newCargoNome}" criado!`);
            setNewCargoOpen(false);
            setNewCargoNome('');
            setNewCargoDesc('');
            setNewCargoRequiresLeader(true);
            setSelectedCargoId(result.id);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao criar cargo.');
        }
    };

    const handleUpdateCargo = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.cargos', 'edit')) {
            toast.error('Seu cargo não permite editar cargos.');
            return;
        }
        if (!editingCargo) return;
        try {
            let passwordToSave = (editingCargo as any).protection_password;
            
            if ((editingCargo as any).new_protection_password) {
                const pwdCheck = validatePasswordComplexity((editingCargo as any).new_protection_password);
                if (!pwdCheck.isValid) {
                    toast.error(`Na senha de proteção: ${pwdCheck.message}`);
                    return;
                }
                const encoder = new TextEncoder();
                const data = encoder.encode((editingCargo as any).new_protection_password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                passwordToSave = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }

            await updateCargo.mutateAsync({ 
                id: editingCargo.id, 
                nome: editingCargo.nome, 
                description: editingCargo.description,
                requires_leader: editingCargo.requires_leader,
                protection_password: passwordToSave,
                protection_mfa_secret: (editingCargo as any).new_protection_mfa_secret || (editingCargo as any).protection_mfa_secret
            });
            // Also save is_protected (not in hook yet)
            await supabase.from('cargos' as any).update({ is_protected: !!editingCargo.is_protected } as any).eq('id', editingCargo.id);
            logAction('editar_cargo', 'cargos', editingCargo.id);
            toast.success('Cargo atualizado!');
            setEditingCargo(null);
        } catch (err: any) { toast.error(err.message); }
    };


    const handleDeleteCargo = async () => {
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.cargos', 'edit')) {
            toast.error('Seu cargo não permite excluir cargos.');
            return;
        }
        if (!confirmDeleteCargoId) return;
        try {
            await deleteCargo.mutateAsync(confirmDeleteCargoId);
            logAction('excluir_cargo', 'cargos', confirmDeleteCargoId);
            toast.success('Cargo excluído!');
            if (selectedCargoId === confirmDeleteCargoId) setSelectedCargoId(null);
            setConfirmDeleteCargoId(null);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleToggleCargoPerm = (resource: string, action: string) => {
        if (!selectedCargoId) return;
        if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
            toast.error('Você não tem permissão para editar configurações.');
            return;
        }
        if (!hasCargoPermission(myCargoPermissions, 'config.cargos', 'edit')) {
            toast.error('Seu cargo não permite alterar permissões de cargos.');
            return;
        }

        const cargo = cargos.find((c: any) => c.id === selectedCargoId);
        
        const performToggle = () => {
            const existing = cargoPerms.find(p => p.resource === resource && p.action === action);
            const newAllowed = !(existing?.allowed ?? false);
            toggleCargoPerm.mutate(
                { cargoId: selectedCargoId, resource, action, allowed: newAllowed },
                {
                    onError: (err: any) => {
                        toast.error(`Erro ao salvar permissão: ${err.message || 'Falha na rede'}`);
                    }
                }
            );
        };

        if (cargo?.is_protected) {
            requireAdminAuth(
                cargo.id,
                cargo.nome,
                performToggle,
                {
                    passwordHash: (cargo as any).protection_password,
                    mfaSecret: (cargo as any).protection_mfa_secret
                }
            );
        } else {
            performToggle();
        }
    };

    const isCargoPermAllowed = (resource: string, action: string): boolean => {
        const perm = cargoPerms.find(p => p.resource === resource && p.action === action);
        return perm?.allowed ?? false;
    };

    const isPermAllowed = (resource: string, action: string): boolean => {
        const perm = profilePerms.find(p => p.resource === resource && p.action === action);
        return perm?.allowed ?? false;
    };

    const handleAssignCargo = (cargoId: string) => {
        if (!selectedProfileId || !selectedProfile) return;

        const performAssign = () => {
            assignProfileToCargo.mutate({ cargoId, profileId: selectedProfileId }, {
                onSuccess: () => {
                    const cargoName = cargos.find((c: any) => c.id === cargoId)?.nome;
                    logAction('vincular_perfil_seguranca', 'security_profiles', selectedProfileId, { cargo: cargoName });
                    toast.success('Cargo vinculado!');
                    setAssignCargoOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['security-profile-cargos', selectedProfileId] });
                },
            });
        };

        if (selectedProfile.is_protected) {
            requireAdminAuth(selectedProfile.id, selectedProfile.name, performAssign, {
                passwordHash: selectedProfile.protection_password,
                mfaSecret: selectedProfile.protection_mfa_secret
            });
        } else {
            performAssign();
        }
    };

    const handleRemoveCargo = (cargoId: string) => {
        if (!selectedProfileId || !selectedProfile) return;

        const performRemove = () => {
            assignProfileToCargo.mutate({ cargoId, profileId: null }, {
                onSuccess: () => {
                    toast.success('Cargo removido do perfil.');
                    queryClient.invalidateQueries({ queryKey: ['security-profile-cargos', selectedProfileId] });
                },
            });
        };

        if (selectedProfile.is_protected) {
            requireAdminAuth(selectedProfile.id, selectedProfile.name, performRemove, {
                passwordHash: selectedProfile.protection_password,
                mfaSecret: selectedProfile.protection_mfa_secret
            });
        } else {
            performRemove();
        }
    };

    const activeProfiles = profiles.filter(p => !p.disabled).length;
    const disabledProfiles = profiles.filter(p => p.disabled).length;

    const userProfileSecurityId = profileCargos.length > 0 ? (profileCargos[0] as any).id : null;   // check superadmin below

    const isCurrentUserSuperadmin = securityProfiles.find(sp => sp.id === (profile as any)?.security_profile_id)?.name.toLowerCase().includes('superadmin');

    if (role !== 'administrador' && !hasPermission(myPagePermissions, 'configuracoes', 'view') && !isCurrentUserSuperadmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-2">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
                    <h2 className="text-lg font-bold font-display">Acesso Restrito</h2>
                    <p className="text-sm text-muted-foreground">Você não tem permissão para acessar as configurações. Verifique seu perfil de segurança.</p>
                </div>
            </div>
        );
    }

    const unassignedCargos = cargos.filter((c: any) => !profileCargos.some((pc: any) => pc.id === c.id));

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-[28px] font-bold font-display text-foreground leading-none">Configurações</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie perfis de segurança e configurações do sistema</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{activeProfiles}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usuários Ativos</p>
                </div>
                <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
                    <Eye className="w-5 h-5 text-warning mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{disabledProfiles}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Desabilitados</p>
                </div>
                <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
                    <ShieldCheck className="w-5 h-5 text-success mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{securityProfiles.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perfis de Segurança</p>
                </div>
                <div className="bg-card rounded-2xl border border-border/40 shadow-elevated hover-lift p-4 text-center">
                    <Activity className="w-5 h-5 text-info mx-auto mb-1" />
                    <p className="text-xl font-bold text-foreground">{retentionMonths}m</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retenção Logs</p>
                </div>
            </div>

            <Tabs defaultValue="profiles" className="space-y-4">
                <TabsList className="bg-card border border-border/40 shadow-elevated p-1 h-auto rounded-xl">
                    <TabsTrigger value="profiles" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Shield className="w-4 h-4" /> Perfis de Segurança
                    </TabsTrigger>
                    <TabsTrigger value="cargos" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Users className="w-4 h-4" /> Cargos e Funções
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Bell className="w-4 h-4" /> Notificações
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Activity className="w-4 h-4" /> Logs de Auditoria
                    </TabsTrigger>
                    <TabsTrigger value="knowledge" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <BrainCircuit className="w-4 h-4" /> IA & Base de Conhecimento
                    </TabsTrigger>
                    <TabsTrigger value="stark" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <AlertTriangle className="w-4 h-4 text-destructive" /> Monitoramento Stark
                    </TabsTrigger>
                    <TabsTrigger value="system" className="gap-1.5 py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-sm rounded-md">
                        <Settings className="w-4 h-4" /> Sistema
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════ TAB: KNOWLEDGE BASE IA ═══════════ */}
                <TabsContent value="knowledge" className="space-y-4">
                    {/* Auto-Analysis Panel */}
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/5 rounded-2xl border border-indigo-300/30 shadow-elevated p-6 space-y-4 relative overflow-hidden">
                        <Cpu className="absolute -top-4 -right-4 w-32 h-32 text-indigo-400/10 opacity-50" />
                        <div className="relative z-10 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-indigo-500" />
                                    <h2 className="text-base font-bold font-display text-foreground">Aprendizado Automático do Sistema</h2>
                                </div>
                                <p className="text-xs text-muted-foreground max-w-xl">
                                    O Stark analisa automaticamente todos os dados do SGC — Leads, Vendas, Atividades, Aprovações, Erros e muito mais — e gera insights estratégicos que ficam disponíveis no seu cérebro. Executado toda segunda-feira, mas você pode forçar agora.
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {['Leads & Campanhas', 'Vendas', 'Performance Consultores', 'Aprovações', 'Erros & Bugs', 'Configurações'].map(tag => (
                                        <span key={tag} className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-300/30 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            {hasPermission(myPagePermissions, 'configuracoes', 'edit') && (
                            <Button
                                size="sm"
                                className="shrink-0 gap-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-brand"
                                disabled={analyzeSystem.isPending}
                                onClick={() => analyzeSystem.mutate(undefined, {
                                    onSuccess: (data: any) => toast.success(data.message || 'Análise concluída! Base de Conhecimento atualizada.'),
                                    onError: (err: any) => toast.error('Erro na análise: ' + err.message),
                                })}
                            >
                                {analyzeSystem.isPending ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</>
                                ) : (
                                    <><RefreshCw className="w-3.5 h-3.5" /> Analisar Sistema Agora</>
                                )}
                            </Button>
                            )}
                        </div>
                        {analyzeSystem.isPending && (
                            <div className="relative z-10 bg-indigo-500/5 border border-indigo-300/20 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-pulse">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                O Stark está lendo todos os dados do sistema e gerando insights com GPT-4o... Isso pode levar até 30 segundos.
                            </div>
                        )}
                    </div>

                    {/* Manual Knowledge Base */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 shadow-elevated p-6 space-y-4 relative overflow-hidden">
                         <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-primary/10 opacity-50" />
                         <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="w-6 h-6 text-primary" />
                                <h2 className="text-lg font-bold font-display text-foreground">Inteligência Artificial (Stark)</h2>
                            </div>
                            {hasPermission(myPagePermissions, 'configuracoes', 'edit') && (
                            <Button size="sm" className="gap-1.5 font-semibold shadow-brand" onClick={() => setNewKbOpen(true)}>
                                <Plus className="w-3.5 h-3.5" /> Ensinar a IA
                            </Button>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground relative z-10 max-w-2xl">
                            Adicione blocos de conhecimento (regras de negócio, passos a passo, como aprovar X ou Y) 
                            para que a Inteligência Artificial possa instruir os usuários instantaneamente em toda a plataforma.
                        </p>

                        {kbLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">Carregando conhecimento da IA...</div>
                        ) : (
                            <div className="space-y-3 mt-4 relative z-10">
                                {knowledgeItems.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border/60 rounded-xl bg-card">
                                        <p className="text-sm text-muted-foreground">O cérebro da IA ainda está vazio.</p>
                                    </div>
                                ) : (
                                    knowledgeItems.map(item => (
                                        <div key={item.id} className="bg-card rounded-xl border border-border/40 p-4 shadow-sm flex items-start gap-3 group">
                                            <div className={`p-2 rounded-lg mt-0.5 ${item.categoria.startsWith('insight_') ? 'bg-indigo-500/10' : 'bg-muted'}`}>
                                                {item.categoria.startsWith('insight_') ? (
                                                    <Cpu className="w-4 h-4 text-indigo-500" />
                                                ) : (
                                                    <BrainCircuit className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className={`text-[10px] ${item.categoria.startsWith('insight_') ? 'bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 border-indigo-300/30' : 'bg-primary/5'}`}>
                                                        {item.categoria.startsWith('insight_') ? '🤖 Auto: ' : ''}{item.categoria.replace('insight_', '')}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap line-clamp-4">{item.content}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => setConfirmDeleteKbId(item.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </TabsContent>


                {/* ═══════════ TAB: STARK WATCHDOG ═══════════ */}
                <TabsContent value="stark" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold font-display flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Monitoramento Autônomo Stark
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Erros interceptados na interface e no banco de dados diagnosticados inteligentemente pela IA.
                            </p>
                        </div>
                        <Button 
                            variant="outline" 
                            className="shrink-0 gap-2 font-medium"
                            onClick={() => updateStarkStatus.mutate({ id: 'dummy', status: 'unresolved'})} // Fake refresh to trigger query invalidation if needed
                        >
                            <History className="w-4 h-4" /> Atualizar Leitura
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {isStarkLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-muted/30 animate-pulse rounded-2xl border border-border/50" />
                                ))}
                            </div>
                        ) : starkErrors && starkErrors.length > 0 ? (
                            starkErrors.map((err) => (
                                <div key={err.id} className="overflow-hidden shadow-sm border border-border/50 group hover:shadow-md transition-all rounded-xl bg-card">
                                    <div className="bg-muted/10 p-4 border-b border-border/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {err.status === 'resolved' ? (
                                                    <Check className="w-5 h-5 text-emerald-500" />
                                                ) : err.status === 'analyzing' ? (
                                                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                                                ) : (
                                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                                )}
                                                <h3 className="text-sm font-semibold truncate max-w-[300px] md:max-w-none">
                                                    {err.source.toUpperCase()}: {err.error_message}
                                                </h3>
                                            </div>
                                            <Badge variant={err.status === 'resolved' ? 'outline' : 'destructive'} className="font-mono text-[10px] capitalize">
                                                {err.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {err.ai_analysis ? (
                                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                                                    <BrainCircuit className="w-4 h-4" /> Diagnóstico da IA
                                                </h4>
                                                <p className="text-sm text-foreground/80 mb-3">{err.ai_analysis}</p>
                                                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">Plano de Ação Sugerido</h4>
                                                <p className="text-sm rounded border border-border/40 bg-background/50 p-2 font-mono text-xs">{err.ai_recommendation}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">
                                                O Edge Function watchdog está analisando em background...
                                            </p>
                                        )}
                                        
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">ID: {err.id.split('-')[0]}</span>
                                            <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                                <History className="w-3 h-3" /> {format(new Date(err.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                            </span>
                                            {err.status !== 'resolved' && err.ai_analysis && (
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="h-7 text-xs ml-auto"
                                                    onClick={() => updateStarkStatus.mutate({ id: err.id, status: 'resolved'})}
                                                    disabled={updateStarkStatus.isPending}
                                                >
                                                    Marcar como Resolvido
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-bold font-display text-foreground mb-1">Nenhum erro detectado</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Em caso de falha sistêmica, o Watchdog aparecerá aqui com um relatório gerado automaticamente por IA.
                                </p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ═══════════ TAB: PERFIS DE SEGURANÇA ═══════════ */}
                <TabsContent value="profiles" className="space-y-4">
                    {/* Migration warning */}
                    {!spLoading && securityProfiles.length === 0 && (
                        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-foreground">Migration necessária</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Execute o script SQL <code className="bg-muted px-1 rounded text-[11px]">supabase/migrations/add_security_profiles.sql</code> no Supabase Dashboard → SQL Editor para criar as tabelas de perfis de segurança.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
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
                            Crie perfis com permissões granulares por guia e subguia. Vincule usuários para aplicar o nível de acesso.
                        </p>

                        {spLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">Carregando perfis...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {securityProfiles.map(sp => (
                                    <div
                                        key={sp.id}
                                        onClick={() => setSelectedProfileId(sp.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-elevated hover-lift ${selectedProfileId === sp.id
                                            ? 'border-primary bg-primary/[0.03] shadow-elevated ring-1 ring-primary/20'
                                            : 'border-border/40 bg-muted/20 hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className={`w-4 h-4 ${selectedProfileId === sp.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <h3 className="text-sm font-bold text-foreground">{sp.name}</h3>
                                            </div>
                                            {sp.is_system && (
                                                <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">Sistema</Badge>
                                            )}
                                            {sp.name?.toLowerCase().includes(SUPER_ADMIN_PROFILE_NAME) && (
                                                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Mestre</Badge>
                                            )}
                                            {!sp.is_system && sp.is_protected && (
                                                <span title="Perfil protegido">
                                                    <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                                                </span>
                                            )}
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

                    {/* ── Selected profile detail ── */}
                    {selectedProfile && (
                        <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-5 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">{selectedProfile.name}</h3>
                                        {selectedProfile.description && <p className="text-xs text-muted-foreground">{selectedProfile.description}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <>
                                        {selectedProfile.is_protected && (
                                            unlockedSession?.id === selectedProfile.id && currentTime < unlockedSession.until ? (
                                                <div className="flex items-center gap-2">
                                                    <span title="Desbloqueado temporariamente" className="flex items-center gap-1 text-[10px] text-success font-semibold px-2 py-0.5 bg-success/10 rounded-full border border-success/20 animate-pulse">
                                                        <Unlock className="w-3.5 h-3.5" /> Desbloqueado ({formatTimeLeft(unlockedSession.until)})
                                                    </span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-6 px-2 text-[10px] gap-1 text-success hover:bg-success/10 border border-success/20"
                                                        onClick={handleFinalizeSession}
                                                    >
                                                        <Check className="w-3 h-3" /> Finalizar e Salvar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span title="Protegido — exige senha + MFA para editar" className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
                                                    <ShieldAlert className="w-3.5 h-3.5" /> Protegido
                                                </span>
                                            )
                                        )}
                                        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                                            const openEdit = () => setEditingProfile({ 
                                                id: selectedProfile.id, 
                                                name: selectedProfile.name, 
                                                description: selectedProfile.description || '',
                                                is_system: selectedProfile.is_system,
                                                is_protected: !!selectedProfile.is_protected,
                                                protection_password: selectedProfile.protection_password,
                                                protection_mfa_secret: selectedProfile.protection_mfa_secret
                                            });
                                            if (selectedProfile.is_protected) {
                                                requireAdminAuth(
                                                    selectedProfile.id,
                                                    selectedProfile.name, 
                                                    openEdit,
                                                    { 
                                                        passwordHash: selectedProfile.protection_password,
                                                        mfaSecret: selectedProfile.protection_mfa_secret
                                                    }
                                                );
                                            } else {
                                                openEdit();
                                            }
                                        }}>
                                            <Pencil className="w-3 h-3" /> Editar
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteId(selectedProfile.id)}>
                                            <Trash2 className="w-3 h-3" /> Excluir
                                        </Button>
                                    </>
                                </div>
                            </div>

                            <Separator className="bg-border/20" />

                            {/* ── Permission matrix with sub-tabs ── */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-bold text-foreground">Matriz de Permissões</h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-muted-foreground">
                                        Defina quais guias e subguias este perfil pode visualizar e editar. Clique na seta para expandir subguias.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 px-3 text-[10px] gap-1.5 font-bold uppercase tracking-wider"
                                            onClick={() => toggleAllPermissions(true)}
                                        >
                                            <Check className="w-3.5 h-3.5" /> Selecionar Tudo
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 px-3 text-[10px] gap-1.5 font-bold uppercase tracking-wider text-muted-foreground"
                                            onClick={() => toggleAllPermissions(false)}
                                        >
                                            <X className="w-3.5 h-3.5" /> Limpar Tudo
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {MODULES_DEF.map((group) => {
                                        const groupActions = new Map<string, { key: string; label: string }>();
                                        group.resources.forEach(res => {
                                            res.actions.forEach(a => {
                                                if (!groupActions.has(a.key)) groupActions.set(a.key, a);
                                            });
                                        });
                                        const uniqueActions = Array.from(groupActions.values());

                                        return (
                                            <div key={group.groupLabel} className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                        {group.groupLabel}
                                                    </h5>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-6 px-2 text-[10px] text-success hover:text-success hover:bg-success/10"
                                                            onClick={() => toggleGroupPermissions(group.groupLabel, true)}
                                                        >
                                                            <Check className="w-3 h-3 mr-1" /> Marcar Bloco
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => toggleGroupPermissions(group.groupLabel, false)}
                                                        >
                                                            <X className="w-3 h-3 mr-1" /> Desmarcar Bloco
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto rounded-lg border border-border/30">
                                                    <table className="w-full text-sm border-collapse bg-card">
                                                        <thead>
                                                            <tr className="border-b border-border/30 bg-muted/20">
                                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[250px]">Recurso</th>
                                                                {uniqueActions.map(a => (
                                                                    <th key={a.key} className="text-center py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[100px]">{a.label}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {group.resources.map((res) => (
                                                                <tr key={res.key} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                                    <td className="py-2.5 px-3 text-sm font-semibold text-foreground">
                                                                        {res.label}
                                                                    </td>
                                                                    {uniqueActions.map(act => {
                                                                        const actionExists = res.actions.some(a => a.key === act.key);
                                                                        if (!actionExists) {
                                                                            return (
                                                                                <td key={act.key} className="text-center py-2.5 px-3">
                                                                                    <div className="w-7 h-7 mx-auto flex items-center justify-center opacity-30 select-none">
                                                                                        <span className="text-xs text-muted-foreground font-bold">-</span>
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        }
                                                                        // Super Admin: always fully granted, toggles locked
                                                                        const allowed = isPermAllowed(res.key, act.key);
                                                                        const disableToggle = false;

                                                                        return (
                                                                            <td key={act.key} className="text-center py-2.5 px-3">
                                                                                <button
                                                                                    onClick={() => handleTogglePerm(res.key, act.key)}
                                                                                    className={`w-7 h-7 rounded-md border transition-all flex items-center justify-center mx-auto ${allowed
                                                                                        ? 'bg-success/15 border-success/30 text-success hover:bg-success/25'
                                                                                        : 'bg-muted/30 border-border/30 text-muted-foreground/30 hover:bg-muted/50'
                                                                                        } ${disableToggle ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                                                    title={disableToggle ? 'Super Admin é imutável' : undefined}
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
                                        )
                                    })}
                                </div>
                            </div>

                            <Separator className="bg-border/20" />

                            {/* ── Cargos assigned ── */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-foreground">Cargos Vinculados ({profileCargos.length})</h4>
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setAssignCargoOpen(true)}>
                                        <UserPlus className="w-3 h-3" /> Vincular Cargo
                                    </Button>
                                </div>

                                {profileCargos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-3 text-center">Nenhum cargo vinculado a este perfil.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {profileCargos.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/20">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{c.nome}</p>
                                                    <p className="text-[10px] text-muted-foreground">{c.description || 'Sem descrição'}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleRemoveCargo(c.id)}>
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

                {/* ═══════════ TAB: CARGOS E FUNÇÕES ═══════════ */}
                <TabsContent value="cargos" className="space-y-4">
                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h2 className="text-base font-bold font-display text-foreground">Cargos e Funções</h2>
                            </div>
                            <Button size="sm" className="gap-1.5 font-semibold shadow-brand" onClick={() => setNewCargoOpen(true)}>
                                <Plus className="w-3.5 h-3.5" /> Novo Cargo
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Gerencie os cargos da organização e suas permissões granulares por subguia. Os cargos definem o que um usuário pode fazer dentro de cada módulo.
                        </p>

                        {cargosLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">Carregando cargos...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {cargos.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-muted-foreground text-xs border border-dashed border-border/40 rounded-xl">
                                        Nenhum cargo cadastrado. Clique em "Novo Cargo" para começar.
                                    </div>
                                ) : (
                                    cargos.map((cargo: any) => (
                                        <div
                                            key={cargo.id}
                                            onClick={() => setSelectedCargoId(cargo.id)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-elevated hover-lift ${selectedCargoId === cargo.id
                                                ? 'border-primary bg-primary/[0.03] shadow-elevated ring-1 ring-primary/20'
                                                : 'border-border/40 bg-muted/20 hover:border-primary/30'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className={`w-4 h-4 ${selectedCargoId === cargo.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <h3 className="text-sm font-bold text-foreground">{cargo.nome}</h3>
                                                </div>
                                                {cargo.is_protected && (
                                                    <span title="Cargo protegido">
                                                        <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">{cargo.description || 'Sem descrição'}</p>
                                            <div className="flex items-center gap-1 mt-2">
                                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground">Clique para gerenciar</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Selected cargo detail ── */}
                    {selectedCargoId && cargos.find((c: any) => c.id === selectedCargoId) && (() => {
                        const selectedCargo = cargos.find((c: any) => c.id === selectedCargoId);
                        return (
                            <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-5 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-primary" />
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">{selectedCargo.nome}</h3>
                                            {selectedCargo.description && <p className="text-xs text-muted-foreground">{selectedCargo.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedCargo.is_protected && (
                                            unlockedSession?.id === selectedCargo.id && currentTime < unlockedSession.until ? (
                                                <div className="flex items-center gap-2">
                                                    <span title="Desbloqueado temporariamente" className="flex items-center gap-1 text-[10px] text-success font-semibold px-2 py-0.5 bg-success/10 rounded-full border border-success/20 animate-pulse">
                                                        <Unlock className="w-3.5 h-3.5" /> Desbloqueado ({formatTimeLeft(unlockedSession.until)})
                                                    </span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-6 px-2 text-[10px] gap-1 text-success hover:bg-success/10 border border-success/20"
                                                        onClick={handleFinalizeSession}
                                                    >
                                                        <Check className="w-3 h-3" /> Finalizar e Salvar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span title="Protegido — exige senha + MFA para editar" className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
                                                    <ShieldAlert className="w-3.5 h-3.5" /> Protegido
                                                </span>
                                            )
                                        )}
                                        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                                            const openEdit = () => setEditingCargo({
                                                id: selectedCargo.id, nome: selectedCargo.nome,
                                                description: selectedCargo.description || '',
                                                requires_leader: selectedCargo.requires_leader !== false,
                                                is_protected: !!selectedCargo.is_protected,
                                                protection_password: (selectedCargo as any).protection_password,
                                                protection_mfa_secret: (selectedCargo as any).protection_mfa_secret
                                            } as any);
                                            if (selectedCargo.is_protected) {
                                                requireAdminAuth(
                                                    selectedCargo.id,
                                                    selectedCargo.nome,
                                                    openEdit,
                                                    {
                                                        passwordHash: (selectedCargo as any).protection_password,
                                                        mfaSecret: (selectedCargo as any).protection_mfa_secret
                                                    }
                                                );
                                            } else {
                                                openEdit();
                                            }
                                        }}>
                                            <Pencil className="w-3 h-3" /> Editar
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => {
                                            if (selectedCargo.is_protected) {
                                                requireAdminAuth(
                                                    selectedCargo.id,
                                                    selectedCargo.nome, 
                                                    () => setConfirmDeleteCargoId(selectedCargo.id),
                                                    { 
                                                        passwordHash: (selectedCargo as any).protection_password,
                                                        mfaSecret: (selectedCargo as any).protection_mfa_secret
                                                    }
                                                );
                                            } else {
                                                setConfirmDeleteCargoId(selectedCargo.id);
                                            }
                                        }}>
                                            <Trash2 className="w-3 h-3" /> Excluir
                                        </Button>
                                    </div>
                                </div>

                                <Separator className="bg-border/20" />

                                {/* Cargo permissions matrix */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-bold text-foreground">Permissões do Cargo</h4>
                                    </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] text-muted-foreground">
                                                Configure quais ações este cargo pode executar em cada subguia e módulo da plataforma.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 px-3 text-[10px] gap-1.5 font-bold uppercase tracking-wider"
                                                    onClick={() => toggleAllCargoPermissions(true)}
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Selecionar Tudo
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 px-3 text-[10px] gap-1.5 font-bold uppercase tracking-wider text-muted-foreground"
                                                    onClick={() => toggleAllCargoPermissions(false)}
                                                >
                                                    <X className="w-3.5 h-3.5" /> Limpar Tudo
                                                </Button>
                                            </div>
                                        </div>

                                    <div className="space-y-6">
                                        {CARGO_MODULES_DEF.map((group) => {
                                            const groupActions = new Map<string, { key: string; label: string }>();
                                            group.resources.forEach(res => {
                                                res.actions.forEach(a => {
                                                    if (!groupActions.has(a.key)) groupActions.set(a.key, a);
                                                });
                                            });
                                            const uniqueActions = Array.from(groupActions.values());

                                            return (
                                                <div key={group.groupLabel} className="space-y-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                            {group.groupLabel}
                                                        </h5>
                                                        <div className="flex items-center gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-[10px] text-success hover:text-success hover:bg-success/10"
                                                                onClick={() => toggleCargoGroupPermissions(group.groupLabel, true)}
                                                            >
                                                                <Check className="w-3 h-3 mr-1" /> Marcar Bloco
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => toggleCargoGroupPermissions(group.groupLabel, false)}
                                                            >
                                                                <X className="w-3 h-3 mr-1" /> Desmarcar Bloco
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="overflow-x-auto rounded-lg border border-border/30">
                                                        <table className="w-full text-sm border-collapse bg-card">
                                                            <thead>
                                                                <tr className="border-b border-border/30 bg-muted/20">
                                                                    <th className="text-left py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[250px]">Recurso</th>
                                                                    {uniqueActions.map(a => (
                                                                        <th key={a.key} className="text-center py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[100px]">{a.label}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.resources.map((res) => (
                                                                    <tr key={res.key} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                                        <td className="py-2.5 px-3 text-sm font-semibold text-foreground">
                                                                            {res.label}
                                                                        </td>
                                                                        {uniqueActions.map(act => {
                                                                            const actionExists = res.actions.some(a => a.key === act.key);
                                                                            if (!actionExists) {
                                                                                return (
                                                                                    <td key={act.key} className="text-center py-2.5 px-3">
                                                                                        <div className="w-7 h-7 mx-auto flex items-center justify-center opacity-30 select-none">
                                                                                            <span className="text-xs text-muted-foreground font-bold">-</span>
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            }
                                                                            const allowed = isCargoPermAllowed(res.key, act.key);
                                                                            return (
                                                                                <td key={act.key} className="text-center py-2.5 px-3">
                                                                                    <button
                                                                                        onClick={() => handleToggleCargoPerm(res.key, act.key)}
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
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </TabsContent>

                {/* ═══════════ TAB: SISTEMA ═══════════ */}
                <TabsContent value="system" className="space-y-4">
                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Retenção de Logs</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">Define por quanto tempo os logs de auditoria são mantidos.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período de Retenção</label>
                                <Select value={retentionMonths} onValueChange={setRetentionMonths}>
                                    <SelectTrigger className="h-10"><Clock className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3 meses</SelectItem>
                                        <SelectItem value="6">6 meses</SelectItem>
                                        <SelectItem value="12">1 ano</SelectItem>
                                        <SelectItem value="24">2 anos</SelectItem>
                                        <SelectItem value="36">3 anos</SelectItem>
                                        <SelectItem value="48">4 anos</SelectItem>
                                        <SelectItem value="60">5 anos</SelectItem>
                                        <SelectItem value="0">Ilimitado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 flex items-end">
                                <Button variant="destructive" size="sm" className="gap-1.5 font-semibold" onClick={() => setCleanupLogsOpen(true)}>
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir Logs Agora
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Notificações</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">Configure a limpeza automática de notificações lidas.</p>
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
                                                <SelectItem value="180">6 meses</SelectItem>
                                                <SelectItem value="365">1 ano</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 flex items-end">
                                        <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setCleanupNotifsOpen(true)}>
                                            <Trash2 className="w-3.5 h-3.5" /> Excluir Agora
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 font-semibold shadow-brand px-6">
                            {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Salvando...' : 'Salvar Configurações'}
                        </Button>
                    </div>
                </TabsContent>

                {/* ═══════════ TAB: NOTIFICAÇÕES ═══════════ */}
                <TabsContent value="notifications" className="space-y-4">
                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Regras de Notificação</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Configure quais eventos geram notificações e para quem. Ative/desative regras e altere o público-alvo conforme necessário.
                        </p>

                        {!hasPermission(myPagePermissions, 'configuracoes', 'edit') && (
                            <div className="p-3 bg-warning/8 border border-warning/20 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                                <p className="text-xs text-muted-foreground">Você possui permissão apenas para <strong>visualizar</strong>. Edição desabilitada pelo seu perfil de segurança.</p>
                            </div>
                        )}

                        {nrLoading ? (
                            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                        ) : notifRules.length === 0 ? (
                            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Migration necessária</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Execute o script SQL <code className="bg-muted px-1 rounded text-[11px]">supabase/migrations/add_notification_rules.sql</code> no Supabase Dashboard → SQL Editor.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border/30 overflow-hidden">
                                <div className="p-3 bg-muted/20 border-b flex justify-between items-center">
                                    <h3 className="text-sm font-semibold">Regras Configuradas</h3>
                                    {hasPermission(myPagePermissions, 'configuracoes', 'edit') && (
                                        <Button size="sm" className="h-8 gap-1.5" onClick={() => setNewRuleOpen(true)}>
                                            <Plus className="w-3.5 h-3.5" /> Nova Regra
                                        </Button>
                                    )}
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/20">
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evento / Label</th>
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-64">Públicos-Alvo</th>
                                            <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Ativo</th>
                                            <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notifRules.map((rule: NotificationRule) => {
                                            const canEditRules = hasPermission(myPagePermissions, 'configuracoes', 'edit');
                                            return (
                                                <tr key={rule.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                    <td className="py-2.5 px-3">
                                                        <p className="text-sm font-medium text-foreground">{rule.event_label}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{rule.event_key}</p>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <MultiSelect
                                                            options={AUDIENCES.map(a => ({ label: a.label, value: a.key }))}
                                                            onValueChange={(vals) => updateAudiences.mutate({ id: rule.id, audiences: vals })}
                                                            defaultValue={rule.audiences || []}
                                                            placeholder="Selecionar públicos"
                                                            disabled={!canEditRules}
                                                            className="h-8 py-0.5 text-xs shadow-none border-border/50 bg-background hover:bg-muted/20"
                                                            maxCount={2}
                                                            modalPopover={true}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center align-middle">
                                                        <Switch
                                                            checked={rule.enabled}
                                                            onCheckedChange={checked => toggleRule.mutate({ id: rule.id, enabled: checked })}
                                                            disabled={!canEditRules}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center align-middle">
                                                        {canEditRules && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => setConfirmDeleteRuleId(rule.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {notifRules.length === 0 && (
                                            <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma regra configurada.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ═══════════ TAB: LOGS DE AUDITORIA (CONFIG) ═══════════ */}
                <TabsContent value="logs" className="space-y-4">
                    <div className="bg-card rounded-2xl border border-border/40 shadow-elevated p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-bold font-display text-foreground">Eventos de Auditoria</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Configure quais ações o sistema registra automaticamente nos logs de auditoria. Ative ou desative eventos por categoria conforme a necessidade.
                        </p>

                        {!hasPermission(myPagePermissions, 'logs_auditoria', 'edit') && (
                            <div className="p-3 bg-warning/8 border border-warning/20 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                                <p className="text-xs text-muted-foreground">Você possui permissão apenas para <strong>visualizar</strong>. Edição desabilitada pelo seu perfil de segurança.</p>
                            </div>
                        )}

                        {alLoading ? (
                            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                        ) : auditLogConfig.length === 0 ? (
                            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Migration necessária</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Execute o script <code className="bg-muted px-1 rounded text-[11px]">supabase/migrations/20260306230000_fix_superadmin_rls_and_audit_config.sql</code> no Supabase Dashboard → SQL Editor.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border/30 overflow-hidden">
                                <div className="p-3 bg-muted/20 border-b flex justify-between items-center">
                                    <h3 className="text-sm font-semibold">Eventos Configurados</h3>
                                    {hasPermission(myPagePermissions, 'logs_auditoria', 'edit') && (
                                        <Button size="sm" className="h-8 gap-1.5" onClick={() => setNewEventOpen(true)}>
                                            <Plus className="w-3.5 h-3.5" /> Novo Evento
                                        </Button>
                                    )}
                                </div>
                                {/* Group by category */}
                                {AUDIT_CATEGORIES.filter(cat => auditLogConfig.some(e => e.category === cat.key)).map(cat => (
                                    <div key={cat.key}>
                                        <div className="px-3 py-2 bg-muted/10 border-b border-border/10">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{cat.label}</span>
                                        </div>
                                        {auditLogConfig.filter(e => e.category === cat.key).map((event: AuditLogConfig) => {
                                            const canEdit = hasPermission(myPagePermissions, 'logs_auditoria', 'edit');
                                            return (
                                                <div key={event.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border/10 hover:bg-muted/10 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground">{event.event_label}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{event.event_key}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Switch
                                                            checked={event.enabled}
                                                            onCheckedChange={checked => toggleAuditEvent.mutate({ id: event.id, enabled: checked })}
                                                            disabled={!canEdit}
                                                        />
                                                        {canEdit && (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => setConfirmDeleteEventId(event.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                {/* Uncategorized */}
                                {auditLogConfig.filter(e => !AUDIT_CATEGORIES.some(c => c.key === e.category)).map((event: AuditLogConfig) => {
                                    const canEdit = hasPermission(myPagePermissions, 'logs_auditoria', 'edit');
                                    return (
                                        <div key={event.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border/10 hover:bg-muted/10 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground">{event.event_label}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">{event.event_key}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Switch
                                                    checked={event.enabled}
                                                    onCheckedChange={checked => toggleAuditEvent.mutate({ id: event.id, enabled: checked })}
                                                    disabled={!canEdit}
                                                />
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => setConfirmDeleteEventId(event.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ═══════════ DIALOGS LIMPEZA MANUAL ═══════════ */}
            <Dialog open={cleanupLogsOpen} onOpenChange={setCleanupLogsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Limpeza Manual de Logs
                        </DialogTitle>
                        <DialogDescription>
                            Selecione o período de logs que deseja excluir permanentemente do banco de dados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-foreground">Período para exclusão</Label>
                            <Select value={cleanupLogsPeriod} onValueChange={setCleanupLogsPeriod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o período..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os logs</SelectItem>
                                    <SelectItem value="1_month">Mais antigos que 1 mês</SelectItem>
                                    <SelectItem value="3_months">Mais antigos que 3 meses</SelectItem>
                                    <SelectItem value="6_months">Mais antigos que 6 meses</SelectItem>
                                    <SelectItem value="1_year">Mais antigos que 1 ano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2 text-warning">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs">Esta ação é <strong>irreversível</strong>. Os registros de auditoria excluídos não poderão ser recuperados.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCleanupLogsOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleCleanupLogs} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cleanupNotifsOpen} onOpenChange={setCleanupNotifsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Limpeza de Notificações
                        </DialogTitle>
                        <DialogDescription>
                            Configure a exclusão manual de notificações já lidas pelos usuários.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-foreground">Período para exclusão</Label>
                            <Select value={cleanupNotifsPeriod} onValueChange={setCleanupNotifsPeriod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o período..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_read">Todas as lidas</SelectItem>
                                    <SelectItem value="7_days">Mais antigas que 7 dias</SelectItem>
                                    <SelectItem value="15_days">Mais antigas que 15 dias</SelectItem>
                                    <SelectItem value="30_days">Mais antigas que 30 dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex items-start gap-2 text-info">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs">Apenas notificações marcadas como <strong>lidas</strong> pelos usuários serão removidas.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCleanupNotifsOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleCleanupNotifs} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ DIALOGS ═══════════ */}
            <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Novo Perfil de Segurança</DialogTitle>
                        <DialogDescription>Defina o nome e descrição. As permissões granulares podem ser configuradas depois.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Nome *</Label>
                            <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Ex: Consultor Pleno" className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Descrição (opcional)</Label>
                            <Textarea value={newProfileDesc} onChange={e => setNewProfileDesc(e.target.value)} placeholder="Descreva as responsabilidades..." rows={2} />
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
                                <Textarea value={editingProfile.description} onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })} rows={2} />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-destructive" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Protegido</p>
                                        <p className="text-[10px] text-muted-foreground">Exige senha + MFA para editar</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!(editingProfile as any).is_protected}
                                    onCheckedChange={v => setEditingProfile({ ...editingProfile, is_protected: v } as any)}
                                />
                            </div>

                            {(editingProfile as any).is_protected && (
                                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/40 animate-fade-in-up mt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Nova Senha de Proteção</Label>
                                        <Input 
                                            type="password" 
                                            placeholder="Deixe em branco para manter a atual"
                                            value={(editingProfile as any).new_protection_password || ''}
                                            onChange={e => setEditingProfile({ ...editingProfile, new_protection_password: e.target.value } as any)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Segredo MFA (TOTP)</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                placeholder="Segredo Base32"
                                                value={(editingProfile as any).new_protection_mfa_secret || (editingProfile as any).protection_mfa_secret || ''}
                                                onChange={e => setEditingProfile({ ...editingProfile, new_protection_mfa_secret: e.target.value } as any)}
                                                className="h-9 text-sm font-mono"
                                            />
                                            <Button size="sm" variant="outline" onClick={() => {
                                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                                                let secret = '';
                                                for (let i = 0; i < 16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
                                                setEditingProfile({ ...editingProfile, new_protection_mfa_secret: secret } as any);
                                            }}>Gerar</Button>
                                        </div>
                                    </div>
                                    {((editingProfile as any).new_protection_mfa_secret || (editingProfile as any).protection_mfa_secret) && (
                                        <div className="mt-3 p-4 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-border/40">
                                            <div className="bg-white p-2 rounded">
                                                <QRCodeSVG 
                                                    value={`otpauth://totp/SGC%20Protegido%20(Perfil):${encodeURIComponent(editingProfile.name)}?secret=${(editingProfile as any).new_protection_mfa_secret || (editingProfile as any).protection_mfa_secret}&issuer=SGC`} 
                                                    size={120} 
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center">Escaneie o QR Code usando o Google Authenticator ou similar.</p>
                                        </div>
                                    )}
                                </div>
                            )}
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

            <Dialog open={assignCargoOpen} onOpenChange={setAssignCargoOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Vincular Cargo</DialogTitle>
                        <DialogDescription>Selecione um cargo para vincular ao perfil "{selectedProfile?.name}".</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
                        {unassignedCargos.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Todos os cargos já estão vinculados a este perfil.</p>
                        ) : (
                            unassignedCargos.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/20 hover:bg-muted/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{c.nome}</p>
                                        <p className="text-[10px] text-muted-foreground">{c.description || 'Sem descrição'}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => handleAssignCargo(c.id)}>
                                        <UserPlus className="w-3 h-3" /> Vincular
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Excluir Perfil</DialogTitle>
                        <DialogDescription>Esta ação é irreversível. Usuários vinculados perderão o perfil.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteProfile} disabled={deleteProfile.isPending} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteRuleId} onOpenChange={() => setConfirmDeleteRuleId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Excluir Regra de Notificação</DialogTitle>
                        <DialogDescription>Tem certeza que deseja remover esta regra permanentemente?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteRuleId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteRule} disabled={deleteRule.isPending} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Nova Regra de Notificação</DialogTitle>
                        <DialogDescription>Defina o label de exibição, a chave do evento no sistema (ex: atividade_pendente) e os públicos que receberão.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Label (Exibição) *</Label>
                            <Input value={newRuleLabel} onChange={e => setNewRuleLabel(e.target.value)} placeholder="Ex: Nova Atividade Cadastrada" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Chave do Evento *</Label>
                            <Select value={newRuleEvent} onValueChange={setNewRuleEvent}>
                                <SelectTrigger className="h-9 text-sm font-mono">
                                    <SelectValue placeholder="Selecione o evento" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENTS.map(ev => (
                                        <SelectItem key={ev.key} value={ev.key}>
                                            <div className="flex flex-col">
                                                <span>{ev.label}</span>
                                                <span className="text-[10px] text-muted-foreground">{ev.key}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">Esta é a chave utilizada nativamente pelo sistema para despachar.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Públicos Múltiplos *</Label>
                            <MultiSelect
                                options={AUDIENCES.map(a => ({ label: a.label, value: a.key }))}
                                onValueChange={setNewRuleAudiences}
                                defaultValue={newRuleAudiences}
                                placeholder="Selecionar públicos..."
                                maxCount={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNewRuleOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateRule} disabled={createRule.isPending} className="gap-1.5">
                            {createRule.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                            Criar Regra
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Novo Evento de Auditoria</DialogTitle>
                        <DialogDescription>Defina um novo tipo de evento que o sistema irá registrar automaticamente nos logs.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Label (Exibição) *</Label>
                            <Input value={newEventLabel} onChange={e => setNewEventLabel(e.target.value)} placeholder="Ex: Arquivar Proposta" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Chave do Evento *</Label>
                            <Input value={newEventKey} onChange={e => setNewEventKey(e.target.value)} placeholder="Ex: arquivar_proposta" className="h-9 font-mono text-sm" />
                            <p className="text-[10px] text-muted-foreground">Use apenas letras minúsculas e underscores.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Categoria *</Label>
                            <Select value={newEventCategory} onValueChange={setNewEventCategory}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {AUDIT_CATEGORIES.map(cat => (
                                        <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNewEventOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateAuditEvent} disabled={createAuditEvent.isPending} className="gap-1.5">
                            {createAuditEvent.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                            Criar Evento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteEventId} onOpenChange={() => setConfirmDeleteEventId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Remover Evento de Log</DialogTitle>
                        <DialogDescription>Este evento será removido da configuração. O sistema deixará de registrar ações deste tipo automaticamente. Deseja continuar?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteEventId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteAuditEvent} disabled={deleteAuditEvent.isPending} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar Remoção
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={newKbOpen} onOpenChange={setNewKbOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" /> Ensinar a IA
                        </DialogTitle>
                        <DialogDescription>
                            Escreva de forma clara como o sistema funciona. A IA usará este texto para responder dúvidas e automatizar processos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
                            <Select value={newKbCategoria} onValueChange={setNewKbCategoria}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="geral">Instrução Geral</SelectItem>
                                    <SelectItem value="crm">CRM & Vendas</SelectItem>
                                    <SelectItem value="aprovacoes">Aprovações</SelectItem>
                                    <SelectItem value="inventario">Inventário</SelectItem>
                                    <SelectItem value="configuracoes">Configurações & Acessos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Conteúdo / Regra de Negócio *</Label>
                            <Textarea 
                                value={newKbContent} 
                                onChange={e => setNewKbContent(e.target.value)} 
                                placeholder="Ex: Para aprovar uma cotação, verifique se o cliente assinou o termo. Se sim, clique no botão aprovar..." 
                                className="min-h-[120px] text-sm" 
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNewKbOpen(false)}>Cancelar</Button>
                        <Button 
                            onClick={async () => {
                                if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
                                    toast.error('Você não tem permissão para editar configurações.');
                                    return;
                                }
                                if (!newKbContent.trim()) { toast.error("O conteúdo é obrigatório"); return; }
                                try {
                                    await createKb.mutateAsync({ content: newKbContent, categoria: newKbCategoria });
                                    toast.success('Conhecimento adicionado ao cérebro da IA!');
                                    setNewKbOpen(false); setNewKbContent('');
                                } catch(e: any) { toast.error(e.message); }
                            }} 
                            disabled={createKb.isPending} 
                            className="gap-1.5 shadow-brand"
                        >
                            {createKb.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                            Salvar Conhecimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteKbId} onOpenChange={() => setConfirmDeleteKbId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Remover Conhecimento</DialogTitle>
                        <DialogDescription>A IA esquecerá imediatamente desta instrução. Deseja prosseguir?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteKbId(null)}>Cancelar</Button>
                        <Button 
                            variant="destructive" 
                            onClick={async () => {
                                if (!hasPermission(myPermissions, 'configuracoes', 'edit')) {
                                    toast.error('Você não tem permissão para editar configurações.');
                                    return;
                                }
                                if(confirmDeleteKbId) {
                                  try { await deleteKb.mutateAsync(confirmDeleteKbId); toast.success('Removido!'); } 
                                  catch(e:any) { toast.error(e.message); }
                                  finally { setConfirmDeleteKbId(null); }
                                }
                            }} 
                            disabled={deleteKb.isPending} 
                            className="gap-1.5"
                        >
                            <Trash2 className="w-4 h-4" /> Apagar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newCargoOpen} onOpenChange={setNewCargoOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Criar Novo Cargo</DialogTitle>
                        <DialogDescription>Crie um novo cargo que poderá ser associado aos perfis de usuários para determinar aprovações.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Nome do Cargo *</Label>
                            <Input value={newCargoNome} onChange={e => setNewCargoNome(e.target.value)} placeholder="Ex: Diretor Comercial" className="h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-muted-foreground">Descrição (Opcional)</Label>
                            <Input value={newCargoDesc} onChange={e => setNewCargoDesc(e.target.value)} placeholder="Ex: Acesso total a aprovações" className="h-9 text-sm" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNewCargoOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateCargo} disabled={createCargo.isPending || !newCargoNome.trim()} className="gap-1.5">
                            {createCargo.isPending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                            Criar Cargo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingCargo} onOpenChange={(open) => !open && setEditingCargo(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg">Editar Cargo</DialogTitle>
                        <DialogDescription>Altere as informações básicas deste cargo.</DialogDescription>
                    </DialogHeader>
                    {editingCargo && (
                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Nome do Cargo *</Label>
                                <Input value={editingCargo.nome} onChange={e => setEditingCargo({ ...editingCargo, nome: e.target.value })} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
                                <Input value={editingCargo.description || ''} onChange={e => setEditingCargo({ ...editingCargo, description: e.target.value })} className="h-9 text-sm" />
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-destructive" />
                                    <Label className="font-bold text-sm">Proteção de Acesso</Label>
                                </div>
                                <Switch
                                    checked={!!editingCargo.is_protected}
                                    onCheckedChange={v => setEditingCargo({ ...editingCargo, is_protected: v })}
                                />
                            </div>

                            {editingCargo.is_protected && (
                                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/40 animate-fade-in-up mt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Nova Senha de Proteção</Label>
                                        <Input 
                                            type="password" 
                                            placeholder="Deixe em branco para manter a atual"
                                            value={(editingCargo as any).new_protection_password || ''}
                                            onChange={e => setEditingCargo({ ...editingCargo, new_protection_password: e.target.value } as any)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Segredo MFA (TOTP)</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                placeholder="Segredo Base32"
                                                value={(editingCargo as any).new_protection_mfa_secret || (editingCargo as any).protection_mfa_secret || ''}
                                                onChange={e => setEditingCargo({ ...editingCargo, new_protection_mfa_secret: e.target.value } as any)}
                                                className="h-9 text-sm font-mono"
                                            />
                                            <Button size="sm" variant="outline" onClick={() => {
                                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                                                let secret = '';
                                                for (let i = 0; i < 16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
                                                setEditingCargo({ ...editingCargo, new_protection_mfa_secret: secret } as any);
                                            }}>Gerar</Button>
                                        </div>
                                    </div>
                                    {((editingCargo as any).new_protection_mfa_secret || (editingCargo as any).protection_mfa_secret) && (
                                        <div className="mt-3 p-4 bg-white/5 rounded-lg flex flex-col items-center justify-center gap-2 border border-border/40">
                                            <div className="bg-white p-2 rounded">
                                                <QRCodeSVG 
                                                    value={`otpauth://totp/SGC%20Protegido%20(Cargo):${encodeURIComponent(editingCargo.nome)}?secret=${(editingCargo as any).new_protection_mfa_secret || (editingCargo as any).protection_mfa_secret}&issuer=SGC`} 
                                                    size={120} 
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center">Escaneie o QR Code usando o Google Authenticator ou similar.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditingCargo(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateCargo} disabled={updateCargo.isPending} className="gap-1.5">
                            <Save className="w-4 h-4" /> Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!confirmDeleteCargoId} onOpenChange={() => setConfirmDeleteCargoId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display text-lg text-destructive">Excluir Cargo</DialogTitle>
                        <DialogDescription>Esta ação é irreversível. Todos os usuários com este cargo terão suas permissões de aprovação revogadas.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteCargoId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteCargo} disabled={deleteCargo.isPending} className="gap-1.5">
                            <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Admin Protection Dialog */}
            <AdminProtectionDialog
                open={adminProtectionDialog.open}
                onOpenChange={(open) => setAdminProtectionDialog(prev => ({ ...prev, open }))}
                onUnlocked={adminProtectionDialog.onUnlocked}
                customProtection={adminProtectionDialog.customProtection}
            />

            {/* Edit Profile Dialog */}
            <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil: {editingProfile?.name}</DialogTitle>
                        <DialogDescription>Altere as informações básicas do perfil.</DialogDescription>
                    </DialogHeader>
                    {editingProfile && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label>Nome do Perfil</Label>
                                <Input 
                                    value={editingProfile.name} 
                                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} 
                                    disabled={editingProfile.is_system}
                                />
                                {editingProfile.is_system && <p className="text-[10px] text-muted-foreground">Nomes de perfis de sistema não podem ser alterados.</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Descrição</Label>
                                <Textarea 
                                    value={editingProfile.description} 
                                    onChange={e => setEditingProfile({ ...editingProfile, description: e.target.value })} 
                                    rows={3}
                                />
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-destructive" />
                                        <Label className="font-bold text-sm">Proteção de Acesso</Label>
                                    </div>
                                    <Switch 
                                        checked={editingProfile.is_protected} 
                                        onCheckedChange={v => setEditingProfile({ ...editingProfile, is_protected: v })} 
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Quando ativo, qualquer alteração neste perfil exigirá uma senha de proteção adicional.
                                </p>
                                
                                {editingProfile.is_protected && (
                                    <div className="space-y-2 mt-2 animate-fade-in-up">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Nova Senha de Proteção</Label>
                                            <Input 
                                                type="password" 
                                                placeholder="Deixe em branco para manter a atual"
                                                value={editingProfile.new_protection_password || ''}
                                                onChange={e => setEditingProfile({ ...editingProfile, new_protection_password: e.target.value })}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Segredo MFA (TOTP)</Label>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="Segredo Base32 (ex: JBSWY3DPEHPK3PXP)"
                                                    value={editingProfile.new_protection_mfa_secret || editingProfile.protection_mfa_secret || ''}
                                                    onChange={e => setEditingProfile({ ...editingProfile, new_protection_mfa_secret: e.target.value })}
                                                    className="h-9 text-sm font-mono"
                                                />
                                                <Button size="sm" variant="outline" onClick={() => {
                                                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                                                    let secret = '';
                                                    for (let i = 0; i < 16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
                                                    setEditingProfile({ ...editingProfile, new_protection_mfa_secret: secret });
                                                }}>Gerar</Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">Insira este segredo no Google Authenticator se desejar proteção MFA.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancelar</Button>
                        <Button onClick={handleUpdateProfile} disabled={updateProfile.isPending}>
                            {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Configuracoes;
