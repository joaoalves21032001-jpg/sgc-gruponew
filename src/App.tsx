import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, registerQueryClient } from "./contexts/AuthContext";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Comercial from "./pages/Comercial";
import Gestao from "./pages/Gestao";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";
import MfaSetup from "./pages/MfaSetup";
import AdminUsuarios from "./pages/AdminUsuarios";
import MinhasAcoes from "./pages/MinhasAcoes";
import Aprovacoes from "./pages/Aprovacoes";
import Inventario from "./pages/Inventario";
import CRM from "./pages/CRM";
import Notificacoes from "./pages/Notificacoes";
import AuditLogs from "./pages/AuditLogs";
import Configuracoes from "./pages/Configuracoes";
import Equipe from "./pages/Equipe";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { Shield } from "lucide-react";
import { Button } from "./components/ui/button";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
registerQueryClient(queryClient);

function NoAccessScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-md">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold font-display text-foreground">Acesso não autorizado</h2>
        <p className="text-sm text-muted-foreground">
          Sua conta ainda não possui acesso ao sistema. Solicite acesso ao administrador na tela de login.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={signOut}>
            Voltar ao Login
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mfaVerified, needsMfa, mfaChecked, setMfaVerified, hasProfile } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  if (hasProfile === false) return <NoAccessScreen />;

  if (hasProfile === null) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground animate-pulse">Verificando acesso...</p>
    </div>
  );

  if (!mfaChecked) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground animate-pulse">Verificando segurança...</p>
    </div>
  );

  if (needsMfa && !mfaVerified) {
    return <MfaSetup onVerified={() => setMfaVerified(true)} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mfaVerified, needsMfa, hasProfile } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium animate-pulse">Carregando...</p>
    </div>
  );
  if (user && hasProfile === true && (!needsMfa || mfaVerified)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              {/* Protected routes — AppLayout uses <Outlet /> internally */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/comercial" element={<Comercial />} />
                <Route path="/minhas-acoes" element={<MinhasAcoes />} />
                <Route path="/aprovacoes" element={<Aprovacoes />} />
                <Route path="/gestao" element={<Gestao />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/equipe" element={<Equipe />} />
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                <Route path="/admin/logs" element={<AuditLogs />} />
                <Route path="/admin/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
