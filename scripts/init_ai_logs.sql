
-- Create the table for storing AI logs
create table if not exists public.ai_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  
  -- Context
  city_name text not null,
  request_type text default 'narrator_briefing', -- helpful if we add more AI types later
  
  -- The Inputs
  prompt_template_id text, -- e.g. "v1_abusive"
  input_payload jsonb, -- The full weather stats object passed to the AI
  
  -- The Outputs
  model_id text not null, -- e.g. "gemini-2.0-flash"
  response_text jsonb, -- The parsed JSON response
  raw_output text, -- The raw string in case JSON parsing failed (optional, for debugging)
  
  -- Meta
  processing_time_ms int,
  token_usage_prompt int,
  token_usage_completion int,
  token_usage_total int,
  
  -- Status
  status text default 'success' -- 'success', 'error', 'filtered'
);

-- Index for common queries
create index if not exists idx_ai_logs_city on public.ai_logs(city_name);
create index if not exists idx_ai_logs_created_at on public.ai_logs(created_at desc);
