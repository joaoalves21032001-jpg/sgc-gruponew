import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, BarChart3, HelpCircle, LogOut,
  UserCog, UserCircle, ChevronLeft, ChevronRight, UserPlus,
  ClipboardList, CheckSquare, Bell, Archive, Search, Activity
} from 'lucide-react';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from './PatenteBadge';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HelpGuide } from './HelpGuide';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Input } from '@/components/ui/input';
import logoWhite from '@/assets/logo-grupo-new-white.png';

type NavRole = 'all' | 'admin' | 'supervisor_up';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  access: NavRole;
  profileToggle?: 'progresso_desabilitado' | 'atividades_desabilitadas' | 'acoes_desabilitadas';
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Meu Progresso', access: 'all', profileToggle: 'progresso_desabilitado' },
  { to: '/comercial', icon: Briefcase, label: 'Registro de Atividades', access: 'all', profileToggle: 'atividades_desabilitadas' },
  { to: '/minhas-acoes', icon: ClipboardList, label: 'Minhas Ações', access: 'all', profileToggle: 'acoes_desabilitadas' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações', access: 'all' },
  { to: '/aprovacoes', icon: CheckSquare, label: 'Aprovações', access: 'supervisor_up' },
  { to: '/gestao', icon: BarChart3, label: 'Dashboard', access: 'supervisor_up' },
  { to: '/inventario', icon: Archive, label: 'Inventário', access: 'all' },
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários', access: 'admin' },
  { to: '/admin/solicitacoes', icon: UserPlus, label: 'Solicitações', access: 'admin' },
  { to: '/admin/logs', icon: Activity, label: 'Logs de Auditoria', access: 'admin' },
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

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '...';
  const percentMeta = 0;
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const isAdmin = role === 'administrador';
  const isSupervisorUp = role === 'supervisor' || role === 'gerente' || role === 'administrador';
  const isGerenteOrDirector = role === 'gerente' || role === 'administrador';
  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  const canAccess = (item: NavItem) => {
    // Role check
    if (item.access === 'admin' && !isAdmin) return false;
    if (item.access === 'supervisor_up' && !isSupervisorUp) return false;
    
    // Profile toggle check — directors/managers/admins always see tabs (they can toggle them)
    // Regular users (consultores) respect the toggle
    if (item.profileToggle && profile && !isGerenteOrDirector && !isSupervisorUp) {
      if ((profile as any)[item.profileToggle]) return false;
    }
    
    return true;
  };

  const filteredItems = useMemo(() => {
    return navItems.filter(item => {
      if (!canAccess(item)) return false;
      if (search && !item.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, role, profile, isAdmin, isSupervisorUp]);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-300 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, hsl(194 55% 12%) 0%, hsl(194 53% 20%) 100%)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-white/[0.08] ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <img src={logoWhite} alt="Grupo New" className={`transition-all duration-300 ${collapsed ? 'h-7' : 'h-8'} opacity-90`} />
      </div>

      {/* Profile Widget */}
      <div className={`border-b border-white/[0.08] ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full border-2 ${borderClass} bg-white/10 flex items-center justify-center overflow-hidden`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-white/40 text-[11px] truncate">{profile?.cargo || 'Consultor de Vendas'}</p>
            </div>
          )}
        </div>
        {!collapsed && patente && (
          <div className="mt-3">
            <PatenteBadge percentMeta={percentMeta} size="sm" />
            <p className="text-white/30 text-[10px] italic leading-tight mt-1.5">{frase}</p>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar guia..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/80 text-[12px] placeholder:text-white/25 focus:outline-none focus:bg-white/[0.1] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const unreadCount = item.to === '/notificacoes' ? unreadNotifications : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="relative shrink-0">
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : ''}`} />
                {item.to === '/notificacoes' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.to === '/notificacoes' && unreadCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1">
        <NavLink
          to="/perfil"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full ${
            isActive ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Meu Perfil</span>}
        </NavLink>
        <button onClick={() => setHelpOpen(true)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/80 w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}>
          <HelpCircle className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Ajuda</span>}
        </button>
        <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} />
        <button
          onClick={signOut}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:bg-destructive/20 hover:text-destructive w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border shadow-elevated flex items-center justify-center hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-foreground" /> : <ChevronLeft className="w-3 h-3 text-foreground" />}
      </button>
    </aside>
  );
}
