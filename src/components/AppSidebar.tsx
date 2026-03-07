import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, BarChart3, HelpCircle, LogOut,
  UserCog, UserCircle, ChevronLeft, ChevronRight,
  ClipboardList, CheckSquare, Bell, Archive, Search, Activity,
  GripVertical, Pin, PinOff, Kanban, Users, Settings
} from 'lucide-react';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from './PatenteBadge';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HelpGuide } from './HelpGuide';
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
  { to: '/gestao', icon: BarChart3, label: 'Dashboard' },
  { to: '/inventario', icon: Archive, label: 'Inventário' },
  { to: '/equipe', icon: Users, label: 'Equipe' },
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários' },
  { to: '/admin/logs', icon: Activity, label: 'Logs de Auditoria' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
];

// NAV_TAB_KEYS replaced by PATH_TO_RESOURCE from useSecurityProfiles

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
  const frase = getFraseMotivacional(percentMeta);
  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  const canAccess = (item: NavItem) => {
    // Rely completely on security profile matrix
    if (item.to === '/admin/configuracoes' && role === 'administrador') return true;
    const resource = PATH_TO_RESOURCE[item.to];
    if (resource) {
      return hasPermission(myPermissions, resource, 'view');
    }
    return false;
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
            className={`flex items-center gap-3 flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-300 relative group/link ${isActive
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-semibold'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground hover:translate-x-0.5'
              } ${collapsed ? 'justify-center' : ''}`}
          >
            {isActive && !collapsed && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary-foreground rounded-r-full" />
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
      className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ease-out border-r border-sidebar-border/50 shadow-2xl ${collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      style={{
        background: 'linear-gradient(170deg, hsl(var(--sidebar-background)) 0%, hsl(var(--sidebar-background)/0.95) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-sidebar-border/50 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <img src={logoWhite} alt="Grupo New" className={`transition-all duration-300 ${collapsed ? 'h-7' : 'h-8'} opacity-90 brightness-[0.95]`} />
      </div>

      {/* Profile Widget */}
      <div className={`border-b border-sidebar-border/50 ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full border-2 ${borderClass} bg-sidebar-accent/10 flex items-center justify-center overflow-hidden shadow-sm`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sidebar-foreground font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in space-y-0.5">
              <p className="text-sidebar-foreground text-[13px] font-semibold truncate leading-tight">{displayName}</p>
              <p className="text-sidebar-foreground/50 text-[11px] font-medium truncate leading-tight tracking-wide uppercase">{profile?.cargo || 'Consultor de Vendas'}</p>
            </div>
          )}
        </div>
        {!collapsed && patente && (
          <div className="mt-4 bg-sidebar-accent/5 p-2 rounded-lg border border-sidebar-border/30 backdrop-blur-sm">
            <PatenteBadge percentMeta={percentMeta} size="sm" />
            <p className="text-sidebar-foreground/40 text-[10px] italic leading-tight mt-1.5 font-medium">{frase}</p>
          </div>
        )}
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
      <div className={`mt-auto border-t border-sidebar-border/50 ${collapsed ? 'p-2' : 'p-4'} space-y-2`}>
        <NavLink
          to="/perfil"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full ${isActive ? 'bg-sidebar-accent/10 text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Meu Perfil</span>}
        </NavLink>
        <div className="flex items-center gap-2">
          <button onClick={() => setHelpOpen(true)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}>
            <HelpCircle className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Ajuda</span>}
          </button>
          <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} />

          {!collapsed && (
            <button
              onClick={signOut}
              className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive group transition-all"
            >
              <span className="group-hover:translate-x-0.5 transition-transform">Sair da conta</span>
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}

          {collapsed && (
            <button
              onClick={signOut}
              title="Sair da conta"
              className="flex items-center justify-center p-2 mt-2 w-full rounded-lg text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Footer text */}
        {!collapsed && (
          <div className="px-3">
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
