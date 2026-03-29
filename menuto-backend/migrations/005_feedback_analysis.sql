-- Migration 005: Add columns for LLM-analyzed feedback signals
-- These store Gemini-extracted taste signals from user feedback text,
-- enabling semantic learning from ratings like "too spicy for me" or "loved the cream sauce".

-- Extracted taste signals from feedback_text (analyzed by Gemini)
ALTER TABLE public.dish_ratings ADD COLUMN IF NOT EXISTS
    taste_signals JSONB DEFAULT NULL;
-- e.g. {"liked": ["creamy", "rich sauce"], "disliked": ["too spicy"], "spice_feedback": "too_hot", "portion_feedback": "good"}

-- Component scores snapshot from the recommendation that led to this rating
-- (needed for Thompson Sampling weight update)
ALTER TABLE public.dish_ratings ADD COLUMN IF NOT EXISTS
    recommendation_scores JSONB DEFAULT NULL;
-- e.g. {"personal_taste": 0.8, "sentiment": 0.7, "craving": 0.6, ...}
