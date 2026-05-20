-- Analysis reviews (post-analysis feedback from dashboard / history)
-- Run in Supabase SQL Editor if submit review fails with missing table errors.

CREATE TABLE IF NOT EXISTS public.analysis_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('image', 'keyword', 'both')),
    part_search_id UUID,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    feedback_type TEXT,
    helpful_features JSONB DEFAULT '[]'::jsonb,
    improvement_suggestions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT analysis_reviews_user_job_unique UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_reviews_user_id
    ON public.analysis_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_reviews_job_id
    ON public.analysis_reviews(job_id);

CREATE INDEX IF NOT EXISTS idx_analysis_reviews_created_at
    ON public.analysis_reviews(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_analysis_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_analysis_reviews_updated_at ON public.analysis_reviews;
CREATE TRIGGER trg_analysis_reviews_updated_at
    BEFORE UPDATE ON public.analysis_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_analysis_reviews_updated_at();

ALTER TABLE public.analysis_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own analysis reviews" ON public.analysis_reviews;
CREATE POLICY "Users can view own analysis reviews"
    ON public.analysis_reviews FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own analysis reviews" ON public.analysis_reviews;
CREATE POLICY "Users can insert own analysis reviews"
    ON public.analysis_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own analysis reviews" ON public.analysis_reviews;
CREATE POLICY "Users can delete own analysis reviews"
    ON public.analysis_reviews FOR DELETE
    USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
