import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  BarChart3, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle
} from 'lucide-react';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { getPatente, getFraseMotivacional } from '@/lib/gamification';
import { PatenteBadge } from './PatenteBadge';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import logoWhite from '@/assets/logo-grupo-new-white.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/comercial', icon: Briefcase, label: 'Comercial' },
  { to: '/gestao', icon: BarChart3, label: 'Gestão', restricted: true },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();

  const displayName = profile?.apelido || profile?.nome_completo?.split(' ')[0] || '...';
  const percentMeta = 0; // Will be calculated from atividades
  const patente = getPatente(percentMeta);
  const frase = getFraseMotivacional(percentMeta);
  const isGestor = ['supervisor', 'gerente', 'administrador'].includes(role ?? '');

  const borderClass = patente?.borderClass ?? 'border-sidebar-border';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen gradient-brand flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center justify-center py-4 border-b border-sidebar-border ${collapsed ? 'px-2' : 'px-4'}`}>
        <img src={logoWhite} alt="Grupo New" className={`transition-all duration-300 ${collapsed ? 'h-8' : 'h-10'} opacity-90`} />
      </div>

      {/* Profile Widget */}
      <div className={`p-4 border-b border-sidebar-border ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-11 h-11 rounded-full border-[3px] ${borderClass} bg-sidebar-accent flex items-center justify-center overflow-hidden`}>
            <span className="text-sidebar-foreground font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in-up">
              <p className="text-sidebar-foreground text-sm font-medium truncate">
                Olá, {displayName}!
              </p>
              <p className="text-sidebar-muted text-xs truncate">Bem-vindo de volta</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 space-y-1.5">
            {patente && <PatenteBadge percentMeta={percentMeta} size="sm" />}
            <p className="text-sidebar-muted text-[11px] italic leading-tight">{frase}</p>
            <p className="text-sidebar-muted text-[10px]">
              {profile?.cargo || 'Consultor de Vendas'} • {role || 'consultor'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.restricted && !isGestor) return null;
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/perfil"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <UserCircle className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Meu Perfil</span>}
        </NavLink>
        <button className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground w-full transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <HelpCircle className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Ajuda</span>}
        </button>
        <button
          onClick={signOut}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground w-full transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:shadow-card-hover transition-shadow"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
        )}
      </button>
    </aside>
  );
}
