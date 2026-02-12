import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import logoHorizontal from '@/assets/logo-grupo-new-horizontal.png';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppSidebar />
      <main className="ml-64 p-6 transition-all duration-300 flex-1">
        <Outlet />
      </main>
      <footer className="ml-64 border-t border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4">
          <img src={logoHorizontal} alt="Grupo New" className="h-8 opacity-70" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Grupo New — Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
