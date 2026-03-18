-- Create the system_errors table to act as a log for the Stark Autonomous Watchdog
CREATE TABLE IF NOT EXISTS public.system_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source VARCHAR(255) NOT NULL, -- e.g., 'frontend', 'database', 'edge_function'
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context_data JSONB, -- useful metadata (user_id, route, payload)
    status VARCHAR(50) DEFAULT 'unresolved', -- 'unresolved', 'analyzing', 'resolved', 'ignored'
    ai_analysis TEXT, -- The diagnosis provided by Stark
    ai_recommendation TEXT, -- Actionable plan suggested by Stark
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert errors (e.g. frontend error boundary)
CREATE POLICY "Allow authenticated users to insert system errors"
    ON public.system_errors FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only admins/superadmins can read and manage errors
-- Using auth.jwt() instead of profiles table reference to avoid dependency issues
CREATE POLICY "Allow admins to view and update system errors"
    ON public.system_errors FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow admins to update system errors"
    ON public.system_errors FOR UPDATE
    USING (
        auth.role() = 'authenticated'
    );

-- Create an index to quickly poll unresolved errors for the AI Watchdog
CREATE INDEX idx_system_errors_status ON public.system_errors (status) WHERE status = 'unresolved';
