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
import { useMyPermissions, hasPermission, PATH_TO_RESOURCE, useSecurityProfiles } from '@/hooks/useSecurityProfiles';
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

  const { data: securityProfiles } = useSecurityProfiles();

  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
  }, [collapsed]);

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '...';
  const percentMeta = 0;
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  const isSuperadminProfile = useMemo(() => {
    if (!profile || !securityProfiles) return false;
    const spId = (profile as any).security_profile_id;
    const sp = securityProfiles.find(s => s.id === spId);
    return sp?.name?.toLowerCase().includes('superadmin') || false;
  }, [profile, securityProfiles]);

  const canAccess = (item: NavItem) => {
    if (item.to === '/admin/configuracoes' && (role === 'administrador' || isSuperadminProfile)) return true;
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

  const handleDragStart = (path: string) => { setDragItem(path); };
  const handleDragOver = (e: React.DragEvent, path: string) => { e.preventDefault(); setDragOver(path); };
  const handleDrop = (targetPath: string) => {
    if (!dragItem || dragItem === targetPath) { setDragItem(null); setDragOver(null); return; }
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
  const handleDragEnd = () => { setDragItem(null); setDragOver(null); };

  const pinnedItems = filteredItems.filter(i => isPinned(i.to));
  const unpinnedItems = filteredItems.filter(i => !isPinned(i.to));

  const renderNavItem = (item: NavItem) => {
    const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
    const badgeCount = item.to === '/notificacoes' ? unreadNotifications
      : item.to === '/aprovacoes' ? pendingApprovals
        : item.to === '/minhas-acoes' ? pendingActions
          : 0;
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
        className={`group/nav-item relative rounded-xl transition-all duration-150 ${isDragging ? 'opacity-30' : ''
          } ${isDragTarget ? 'ring-1 ring-cyan-400/30' : ''}`}
      >
        <div className="flex items-center">
          {/* Drag handle */}
          {!collapsed && !search && (
            <div className="shrink-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-white/20" />
            </div>
          )}

          <NavLink
            to={item.to}
            className={`flex items-center gap-3 flex-1 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative group/link ${isActive
              ? 'text-white font-semibold'
              : 'text-sidebar-foreground/55 hover:bg-white/5 hover:text-sidebar-foreground hover:translate-x-0.5'
              } ${collapsed ? 'justify-center' : ''}`}
            style={isActive ? {
              background: 'linear-gradient(135deg, hsl(185 90% 48% / 0.2) 0%, hsl(256 80% 65% / 0.15) 100%)',
              boxShadow: 'inset 0 0 0 1px hsl(185 90% 48% / 0.25), 0 0 20px hsl(185 90% 48% / 0.08)',
            } : undefined}
          >
            {/* Active left neon bar */}
            {isActive && !collapsed && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                style={{ background: 'linear-gradient(180deg, hsl(185,90%,55%), hsl(256,80%,65%))' }}
              />
            )}

            <div className="relative shrink-0 flex items-center justify-center">
              <item.icon
                className={`w-[18px] h-[18px] transition-all duration-300 group-hover/link:scale-110 ${isActive
                  ? 'text-cyan-400'
                  : 'text-sidebar-foreground/45 group-hover/link:text-sidebar-foreground'
                  }`}
                style={isActive ? { filter: 'drop-shadow(0 0 6px hsl(185 90% 55% / 0.7))' } : undefined}
              />
              {badgeCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center badge-pending"
                  style={{ background: 'hsl(185 90% 48%)', color: 'hsl(222 38% 6%)' }}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </div>

            {!collapsed && <span className="flex-1">{item.label}</span>}

            {!collapsed && badgeCount > 0 && (
              <span
                className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'hsl(185 90% 48% / 0.2)', color: 'hsl(185 90% 60%)', border: '1px solid hsl(185 90% 48% / 0.3)' }}
              >
                {badgeCount}
              </span>
            )}
          </NavLink>

          {/* Pin button */}
          {!collapsed && !search && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePin(item.to); }}
              className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover/nav-item:opacity-100 transition-all hover:bg-white/8 ${pinned ? 'opacity-100 bg-cyan-400/10' : ''}`}
              title={pinned ? 'Desafixar' : 'Fixar'}
            >
              {pinned ? (
                <PinOff className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-sidebar-foreground/35 hover:text-sidebar-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ease-out ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      style={{
        background: 'linear-gradient(170deg, hsl(222 40% 6%) 0%, hsl(222 35% 8%) 50%, hsl(242 32% 9%) 100%)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid hsl(222 25% 15%)',
        boxShadow: '4px 0 40px hsl(222 38% 3% / 0.6)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 ${collapsed ? 'justify-center px-2' : 'px-5'}`}
        style={{ borderBottom: '1px solid hsl(222 25% 14%)' }}
      >
        <img
          src={logoWhite}
          alt="Grupo New"
          className={`transition-all duration-300 ${collapsed ? 'h-7' : 'h-8'}`}
          style={{ filter: 'brightness(1.1) drop-shadow(0 0 12px hsl(185 90% 48% / 0.3))' }}
        />
      </div>

      {/* Profile Widget */}
      <div
        className={`${collapsed ? 'p-3' : 'p-4'}`}
        style={{ borderBottom: '1px solid hsl(222 25% 14%)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`shrink-0 w-10 h-10 rounded-full border-2 ${borderClass} flex items-center justify-center overflow-hidden`}
            style={{ background: 'hsl(222 32% 12%)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-cyan-400 font-bold text-sm" style={{ textShadow: '0 0 10px hsl(185 90% 48% / 0.5)' }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in space-y-0.5">
              <p className="text-sidebar-foreground text-[13px] font-semibold truncate leading-tight">{displayName}</p>
              <p className="text-sidebar-muted text-[11px] font-medium truncate leading-tight tracking-wide uppercase">{profile?.cargo || 'Consultor de Vendas'}</p>
            </div>
          )}
        </div>
        {!collapsed && patente && (
          <div
            className="mt-3 p-2 rounded-xl"
            style={{ background: 'hsl(222 30% 11%)', border: '1px solid hsl(222 25% 18%)' }}
          >
            <PatenteBadge percentMeta={percentMeta} size="sm" />
            <p className="text-sidebar-muted text-[10px] italic leading-tight mt-1.5 font-medium">{frase}</p>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-muted group-focus-within/search:text-cyan-400 transition-colors duration-200" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar guia..."
              className="w-full h-9 pl-9 pr-3 rounded-xl text-sidebar-foreground text-[13px] placeholder:text-sidebar-muted focus:outline-none transition-all duration-300"
              style={{
                background: 'hsl(222 32% 11%)',
                border: '1px solid hsl(222 22% 18%)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'hsl(185 90% 48% / 0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(185 90% 48% / 0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'hsl(222 22% 18%)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {pinnedItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pb-1 pt-0.5">
                <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold">Fixados</span>
              </div>
            )}
            {pinnedItems.map(renderNavItem)}
            {unpinnedItems.length > 0 && (
              <div className="my-2 mx-3" style={{ borderTop: '1px solid hsl(222 20% 18%)' }} />
            )}
          </>
        )}
        {unpinnedItems.map(renderNavItem)}
      </nav>

      {/* Footer */}
      <div
        className={`mt-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}
        style={{ borderTop: '1px solid hsl(222 25% 14%)' }}
      >
        <NavLink
          to="/perfil"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 w-full ${isActive ? 'text-cyan-400 bg-cyan-400/8' : 'text-sidebar-foreground/55 hover:bg-white/5 hover:text-sidebar-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Meu Perfil</span>}
        </NavLink>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHelpOpen(true)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-sidebar-foreground/55 hover:bg-white/5 hover:text-sidebar-foreground w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
          >
            <HelpCircle className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Ajuda</span>}
          </button>
          <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} />

          {!collapsed && (
            <button
              onClick={signOut}
              className="flex items-center justify-between flex-1 px-3 py-2 rounded-xl text-[13px] font-medium text-sidebar-foreground/55 hover:text-red-400 hover:bg-red-400/8 group transition-all"
            >
              <span className="group-hover:translate-x-0.5 transition-transform">Sair</span>
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          )}

          {collapsed && (
            <button
              onClick={signOut}
              title="Sair da conta"
              className="flex items-center justify-center p-2 mt-1 w-full rounded-xl text-sidebar-foreground/55 hover:bg-red-400/8 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pt-1">
            <p className="text-[10px] font-medium" style={{ color: 'hsl(222 20% 35%)' }}>SGC v2.0</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10 hidden md:flex"
        style={{
          background: 'hsl(222 35% 10%)',
          border: '1px solid hsl(185 90% 48% / 0.3)',
          color: 'hsl(185 90% 60%)',
          boxShadow: '0 0 12px hsl(185 90% 48% / 0.2)',
        }}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
