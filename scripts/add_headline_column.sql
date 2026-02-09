-- Add dedicated headline column to ai_logs for better observability
ALTER TABLE public.ai_logs 
ADD COLUMN IF NOT EXISTS headline TEXT;

-- Optional: Populate existing rows from the JSONB blob
UPDATE public.ai_logs 
SET headline = response_text->>'headline' 
WHERE headline IS NULL AND response_text ? 'headline';

-- Index for title-based searches
CREATE INDEX IF NOT EXISTS idx_ai_logs_headline ON public.ai_logs(headline);
