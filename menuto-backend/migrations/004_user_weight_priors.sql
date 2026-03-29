-- Per-user weight priors for Thompson Sampling
-- Each row is a Beta(alpha, beta) distribution for one scoring component
CREATE TABLE IF NOT EXISTS public.user_weight_priors (
    user_id TEXT NOT NULL,
    component TEXT NOT NULL,  -- e.g. 'personal_taste', 'sentiment', etc.
    alpha DOUBLE PRECISION NOT NULL DEFAULT 2.0,  -- success count
    beta DOUBLE PRECISION NOT NULL DEFAULT 2.0,   -- failure count
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_weight_priors_pkey PRIMARY KEY (user_id, component)
);

CREATE INDEX IF NOT EXISTS idx_user_weight_priors_user_id ON user_weight_priors (user_id);
