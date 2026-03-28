-- Review cache table for storing Google Places reviews
-- Avoids hitting the API on every recommendation request (1,000 free calls/month)

CREATE TABLE IF NOT EXISTS review_cache (
    place_id TEXT PRIMARY KEY,
    reviews JSONB NOT NULL DEFAULT '[]',
    review_count INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for TTL-based cache lookup
CREATE INDEX IF NOT EXISTS idx_review_cache_fetched_at ON review_cache (fetched_at);

-- Optional: Enable RLS if you want to restrict access
-- ALTER TABLE review_cache ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role can manage review cache" ON review_cache
--     FOR ALL USING (auth.role() = 'service_role');
