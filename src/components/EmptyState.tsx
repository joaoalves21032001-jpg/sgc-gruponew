import { Package } from 'lucide-react';

interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Package, title, description, action }: EmptyStateProps) {
    return (
        <div className="glass-empty rounded-2xl p-10 flex flex-col items-center text-center max-w-md mx-auto my-8 shadow-elevated">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5">
                <Icon className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-bold font-display text-foreground mb-2">{title}</h3>
            {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
