import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Comercial from "./pages/Comercial";
import Gestao from "./pages/Gestao";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";
import MfaSetup from "./pages/MfaSetup";
import AdminUsuarios from "./pages/AdminUsuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mfaVerified, needsMfa, setMfaVerified } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  
  // Show MFA setup/verification if needed
  if (needsMfa && !mfaVerified) {
    return <MfaSetup onVerified={() => setMfaVerified(true)} />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mfaVerified, needsMfa } = useAuth();
  if (loading) return null;
  if (user && (!needsMfa || mfaVerified)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/comercial" element={<Comercial />} />
              <Route path="/gestao" element={<Gestao />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
