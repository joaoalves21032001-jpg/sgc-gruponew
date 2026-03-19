import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, BarChart3, HelpCircle, LogOut,
  UserCog, UserCircle, ChevronLeft, ChevronRight,
  ClipboardList, CheckSquare, Bell, Archive, Search, Activity,
  GripVertical, Pin, PinOff, Kanban, Users, Settings
} from 'lucide-react';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { getPatente } from '@/lib/gamification';
import { PatenteBadge } from './PatenteBadge';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useSidebarOrder } from '@/hooks/useSidebarOrder';
import { useMyPermissions, hasPermission, PATH_TO_RESOURCE } from '@/hooks/useSecurityProfiles';
import { usePendingApprovals, useMyPendingActions } from '@/hooks/usePendingCounts';
import logoWhite from '@/assets/logo-grupo-new-white.png';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  profileToggle?: 'progresso_desabilitado' | 'atividades_desabilitadas' | 'acoes_desabilitadas';
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Meu Progresso', profileToggle: 'progresso_desabilitado' },
  { to: '/comercial', icon: Briefcase, label: 'Registro de Atividades', profileToggle: 'atividades_desabilitadas' },
  { to: '/minhas-acoes', icon: ClipboardList, label: 'Minhas Ações', profileToggle: 'acoes_desabilitadas' },
  { to: '/crm', icon: Kanban, label: 'CRM' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações' },
  { to: '/aprovacoes', icon: CheckSquare, label: 'Aprovações' },
  { to: '/gestao', icon: BarChart3, label: 'Painel de Gestão' },
  { to: '/inventario', icon: Archive, label: 'Inventário' },
  { to: '/equipe', icon: Users, label: 'Equipe' },
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários' },
  { to: '/admin/logs', icon: Activity, label: 'Logs de Auditoria' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
];

// Additional path mappings for PATH_TO_RESOURCE:
// /comercial → 'atividades', /gestao → 'dashboard' (view-only)

// NAV_TAB_KEYS replaced by PATH_TO_RESOURCE from useSecurityProfiles

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const unreadNotifications = useUnreadCount();
  const { sortItems, setOrder, togglePin, isPinned } = useSidebarOrder();
  const { data: myPermissions } = useMyPermissions();
  const { data: pendingApprovals = 0 } = usePendingApprovals();
  const { data: pendingActions = 0 } = useMyPendingActions();

  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Propagate sidebar collapsed state to <html> for CSS-driven layout adaptation
  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
  }, [collapsed]);

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '...';
  const percentMeta = 0;
  const patente = getPatente(percentMeta);
  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  const canAccess = (item: NavItem) => {
    const resourceKey = item.to === '/' ? 'progresso'
      : item.to === '/comercial' ? 'atividades'
      : item.to === '/gestao' ? 'dashboard'
      : item.to === '/admin/usuarios' ? 'usuarios'
      : item.to === '/admin/logs' ? 'logs_auditoria'
      : PATH_TO_RESOURCE[item.to];
    if (!resourceKey) return false;
    // useMyPermissions already returns the merged result of (SP ceiling AND cargo)
    return hasPermission(myPermissions, resourceKey, 'view');
  };

  const filteredItems = useMemo(() => {
    const accessible = navItems.filter(item => canAccess(item));
    const sorted = sortItems(accessible);
    if (search) {
      return sorted.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));
    }
    return sorted;
  }, [search, profile, myPermissions, sortItems]);

  const handleDragStart = (path: string) => {
    setDragItem(path);
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    setDragOver(path);
  };

  const handleDrop = (targetPath: string) => {
    if (!dragItem || dragItem === targetPath) {
      setDragItem(null);
      setDragOver(null);
      return;
    }
    const currentOrder = filteredItems.map(i => i.to);
    const fromIdx = currentOrder.indexOf(dragItem);
    const toIdx = currentOrder.indexOf(targetPath);
    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem);
    setOrder(newOrder);
    setDragItem(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOver(null);
  };

  // Separate pinned and unpinned for visual divider
  const pinnedItems = filteredItems.filter(i => isPinned(i.to));
  const unpinnedItems = filteredItems.filter(i => !isPinned(i.to));

  const renderNavItem = (item: NavItem) => {
    const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
    const badgeCount = item.to === '/notificacoes' ? unreadNotifications : item.to === '/aprovacoes' ? pendingApprovals : item.to === '/minhas-acoes' ? pendingActions : 0;
    const pinned = isPinned(item.to);
    const isDragging = dragItem === item.to;
    const isDragTarget = dragOver === item.to;

    return (
      <div
        key={item.to}
        draggable={!search}
        onDragStart={() => handleDragStart(item.to)}
        onDragOver={(e) => handleDragOver(e, item.to)}
        onDrop={() => handleDrop(item.to)}
        onDragEnd={handleDragEnd}
        className={`group/nav-item relative rounded-lg transition-all duration-150 ${isDragging ? 'opacity-40' : ''
          } ${isDragTarget ? 'ring-1 ring-white/20' : ''}`}
      >
        <div className="flex items-center">
          {/* Drag handle */}
          {!collapsed && !search && (
            <div className="shrink-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-white/25" />
            </div>
          )}

          <NavLink
            to={item.to}
            className={`flex items-center gap-3 flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative group/link ${isActive
              ? 'bg-primary text-primary-foreground shadow-md font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-primary/8 hover:text-primary hover:translate-x-0.5'
              } ${collapsed ? 'justify-center' : ''}`}
          >
            {isActive && !collapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-white rounded-r-full shadow-sm" />
            )}

            <div className="relative shrink-0 flex items-center justify-center">
              <item.icon className={`w-[18px] h-[18px] transition-transform duration-300 group-hover/link:scale-110 ${isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover/link:text-sidebar-foreground'}`} />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive shadow-sm text-[9px] font-bold text-destructive-foreground flex items-center justify-center badge-pending transform scale-90">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </div>
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && badgeCount > 0 && (
              <span className="ml-auto px-1.5 py-0.5 rounded-full bg-destructive shadow-sm text-[10px] font-bold text-destructive-foreground">
                {badgeCount}
              </span>
            )}
          </NavLink>

          {/* Pin button */}
          {!collapsed && !search && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePin(item.to); }}
              className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover/nav-item:opacity-100 transition-all ${pinned ? 'opacity-100 bg-sidebar-accent/10' : 'hover:bg-sidebar-accent/20'}`}
              title={pinned ? 'Desafixar' : 'Fixar'}
            >
              {pinned ? (
                <PinOff className="w-3.5 h-3.5 text-sidebar-primary" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-sidebar-foreground/40 hover:text-sidebar-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ease-out border-r border-sidebar-border/40 shadow-2xl ${collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      style={{
        background: 'hsl(var(--sidebar-background))',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Logo — header with brand gradient strip */}
      <div
        className={`flex items-center h-16 border-b border-sidebar-border/50 ${collapsed ? 'justify-center px-2' : 'px-5'}`}
        style={{ background: 'linear-gradient(135deg, hsl(194 60% 18%), hsl(194 53% 26%))' }}
      >
        <img src={logoWhite} alt="Vitaliza Seguros" className={`transition-all duration-300 ${collapsed ? 'h-7' : 'h-8'}`} />
      </div>

      {/* Profile Widget */}
      <div className={`border-b border-sidebar-border/50 ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full border-2 ${borderClass} bg-sidebar-accent/10 flex items-center justify-center overflow-hidden shadow-sm`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sidebar-foreground font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 animate-fade-in space-y-0.5">
              <p className="text-sidebar-foreground text-[13px] font-semibold truncate leading-tight">{displayName}</p>
              <p className="text-sidebar-foreground/50 text-[11px] font-medium truncate leading-tight tracking-wide uppercase">{profile?.cargo || 'Consultor de Vendas'}</p>
              {patente && (
                <div className="mt-1">
                  <PatenteBadge percentMeta={percentMeta} size="sm" />
                </div>
              )}
            </div>
          )}
          {/* Logout inline com avatar */}
          <button
            onClick={signOut}
            title="Sair da conta"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40 group-focus-within/search:text-sidebar-primary transition-colors duration-200" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar guia..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-sidebar-accent/5 border border-sidebar-border/30 text-sidebar-foreground text-[13px] placeholder:text-sidebar-foreground/40 focus:outline-none focus:bg-sidebar-accent/10 focus:border-sidebar-primary/30 transition-all duration-300 shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {pinnedItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pb-1 pt-0.5">
                <span className="text-[10px] uppercase tracking-wider text-white/25 font-semibold">Fixados</span>
              </div>
            )}
            {pinnedItems.map(renderNavItem)}
            {unpinnedItems.length > 0 && (
              <div className="my-1.5 mx-3 border-t border-white/[0.06]" />
            )}
          </>
        )}
        {unpinnedItems.map(renderNavItem)}
      </nav>

      {/* Footer */}
      <div className={`mt-auto border-t border-sidebar-border/50 ${collapsed ? 'p-2' : 'p-4'} space-y-1`}>
        <NavLink
          to="/perfil"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full ${isActive ? 'bg-sidebar-accent/10 text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Meu Perfil</span>}
        </NavLink>

        {/* Footer text */}
        {!collapsed && (
          <div className="px-3 pt-1">
            <p className="text-[10px] text-sidebar-foreground/30 font-medium">SGC v2.0</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-sidebar-background border border-sidebar-border/50 w-6 h-6 rounded-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 shadow-sm transition-all z-10 hidden md:flex"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
