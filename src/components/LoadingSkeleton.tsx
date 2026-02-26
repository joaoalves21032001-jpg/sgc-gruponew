export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-xl p-5 shadow-card border border-border/30 bg-card space-y-3 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                    <div className="h-3 w-24 rounded skeleton-wave" />
                    <div className="h-8 w-20 rounded skeleton-wave" />
                    <div className="h-3 w-32 rounded skeleton-wave" />
                </div>
                <div className="w-11 h-11 rounded-lg skeleton-wave" />
            </div>
        </div>
    );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-xl p-4 border border-border/30 bg-card flex items-center gap-4 ${className}`}>
            <div className="w-10 h-10 rounded-full skeleton-wave shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded skeleton-wave" />
                <div className="h-3 w-64 rounded skeleton-wave" />
            </div>
            <div className="h-6 w-16 rounded-full skeleton-wave" />
        </div>
    );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-xl p-6 shadow-card border border-border/30 bg-card ${className}`}>
            <div className="h-4 w-36 rounded skeleton-wave mb-5" />
            <div className="flex items-end gap-3 h-[200px]">
                {[0.6, 0.8, 0.45, 0.9, 0.7, 0.5, 0.85].map((h, i) => (
                    <div key={i} className="flex-1 skeleton-wave rounded-t" style={{ height: `${h * 100}%` }} />
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 w-56 rounded skeleton-wave" />
                <div className="h-4 w-72 rounded skeleton-wave" />
            </div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
            {/* Progress bar */}
            <div className="rounded-xl p-6 shadow-card border border-border/30 bg-card space-y-3">
                <div className="h-4 w-40 rounded skeleton-wave" />
                <div className="h-2.5 w-full rounded-full skeleton-wave" />
            </div>
            {/* Chart + Mini */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SkeletonChart className="lg:col-span-2" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </div>
        </div>
    );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
    );
}
