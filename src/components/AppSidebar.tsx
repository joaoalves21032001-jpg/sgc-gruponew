import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  BarChart3, 
  HelpCircle,
  LogOut,
  UserCog,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ClipboardList,
  CheckSquare,
  Bell,
  Archive,
} from 'lucide-react';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from './PatenteBadge';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HelpGuide } from './HelpGuide';
import { useUnreadCount } from '@/hooks/useNotifications';
import logoWhite from '@/assets/logo-grupo-new-white.png';

type NavRole = 'all' | 'admin' | 'supervisor_up';

const navItems: { to: string; icon: any; label: string; access: NavRole }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Meu Progresso', access: 'all' },
  { to: '/comercial', icon: Briefcase, label: 'Registro de Atividades', access: 'all' },
  { to: '/minhas-acoes', icon: ClipboardList, label: 'Minhas Ações', access: 'all' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações', access: 'all' },
  { to: '/aprovacoes', icon: CheckSquare, label: 'Aprovações', access: 'supervisor_up' },
  { to: '/gestao', icon: BarChart3, label: 'Dashboard', access: 'supervisor_up' },
  { to: '/inventario', icon: Archive, label: 'Inventário', access: 'admin' },
  { to: '/admin/usuarios', icon: UserCog, label: 'Usuários', access: 'admin' },
  { to: '/admin/solicitacoes', icon: UserPlus, label: 'Solicitações', access: 'admin' },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '...';
  const percentMeta = 0;
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const isAdmin = role === 'administrador';
  const isSupervisorUp = role === 'supervisor' || role === 'gerente' || role === 'administrador';
  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  const canAccess = (access: NavRole) => {
    if (access === 'all') return true;
    if (access === 'admin') return isAdmin;
    if (access === 'supervisor_up') return isSupervisorUp;
    return false;
  };

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
        <img
          src={logoWhite}
          alt="Grupo New"
          className={`transition-all duration-300 ${collapsed ? 'h-7' : 'h-8'} opacity-90`}
        />
      </div>

      {/* Profile Widget */}
      <div className={`border-b border-white/[0.08] ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full border-2 ${borderClass} bg-white/10 flex items-center justify-center overflow-hidden`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-white/40 text-[11px] truncate">
                {profile?.cargo || 'Consultor de Vendas'}
              </p>
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

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (!canAccess(item.access)) return null;
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
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
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
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
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-foreground" />
        )}
      </button>
    </aside>
  );
}
