import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import logoHorizontal from '@/assets/logo-grupo-new-horizontal.png';
import { motion, AnimatePresence } from 'framer-motion';

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppSidebar />
      <main className="ml-[260px] p-8 transition-all duration-300 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="ml-[260px] border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 py-4">
          <img src={logoHorizontal} alt="Grupo New" className="h-7 opacity-50 grayscale" />
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} Grupo New — Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
