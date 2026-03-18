import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Ops! Algo deu errado</h1>
              <p className="text-muted-foreground text-sm">
                Ocorreu um erro inesperado ao carregar o sistema. Por favor, tente recarregar a página.
              </p>
            </div>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-48 text-[10px] font-mono border border-border">
                <p className="text-destructive font-bold mb-1">{this.state.error.toString()}</p>
                <div className="text-muted-foreground opacity-70 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Recarregar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Início
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
