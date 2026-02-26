import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-[60vh] animate-fade-in-up">
                    <div className="text-center space-y-4 max-w-md mx-auto p-8">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold font-display text-foreground">Algo deu errado</h2>
                        <p className="text-sm text-muted-foreground">
                            Ocorreu um erro inesperado. Tente recarregar a página.
                        </p>
                        {this.state.error && (
                            <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">
                                <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.message}</pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-brand btn-press hover:opacity-90 transition-opacity"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
