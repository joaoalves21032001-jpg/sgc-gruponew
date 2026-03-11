import React, { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      // We attempt to log the error to the database so Stark can analyze it
      await supabase.from('system_errors' as any).insert({
        source: 'frontend',
        error_message: error.message || 'Unknown Error',
        stack_trace: error.stack || errorInfo.componentStack,
        context_data: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          user_id: session?.session?.user?.id || 'anonymous'
        }
      });
      
      // Note: If the user is unauthenticated, RLS might block this insert unless we adjusted the policy 
      // or if we call an edge function. For now, we rely on the authenticated role policy.
    } catch (dbError) {
      console.error("Failed to log error to Stark Watchdog:", dbError);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex flex-col items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Ops! Algo deu errado.</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Ocorreu um erro inesperado nesta parte do sistema. Não se preocupe, nossa inteligência artificial Stark já foi notificada e está analisando o problema para correção.
          </p>
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
               <RefreshCw className="w-4 h-4" /> Recarregar Página
             </Button>
             <Button onClick={() => window.location.href = '/'} className="gap-2 shadow-brand">
               Voltar ao Início
             </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
             <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left overflow-auto max-w-full text-xs font-mono text-muted-foreground border border-border/50">
                <p className="font-bold text-destructive mb-2">{this.state.error?.toString()}</p>
                <div className="whitespace-pre-wrap">{this.state.error?.stack}</div>
             </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
