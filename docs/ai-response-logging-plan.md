# AI Response Logging Plan

## Overview
This plan outlines the architecture for PERSISTING every AI-generated narrator response. This allows for:
1.  **Forensic Analysis**: Reviewing what the AI actually said vs. the weather data.
2.  **Fine-Tuning**: Building a dataset of "good" vs. "bad" responses.
3.  **Cost Auditing**: Tracking token usage per city/request.
4.  **Debugging**: diagnosing "hallucinations" or tone issues.

## 1. Technology Stack
We will use **Supabase** (PostgreSQL) for storage due to its JSONB capabilities, which are perfect for storing the variable structure of AI parameters/responses.

- **Database**: Supabase (Postgres)
- **Library**: `@supabase/supabase-js`
- **Environment**: Next.js API Routes (Server-side)

## 2. Implementation Steps

### Option A: Automated Setup (Recommended)
*Requires `SUPABASE_ACCESS_TOKEN` to be configured in the MCP server.*
1.  **Check Projects**: Verify existing projects.
2.  **Create Project**: Spin up `weather-app-logs` if it doesn't exist.
3.  **Apply Schema**: Automatically apply SQL.

### Option B: Manual Setup (Fallback)
*Use this if MCP is unauthorized.*

### Step 1: Install Dependencies
The project is missing the Supabase client SDK.

```bash
npm install @supabase/supabase-js
```

### Step 2: Database Schema (SQL)
Execute this SQL in the Supabase SQL Editor to create the logging table.
*Note: This creates a new table `ai_logs` and does not modify existing tables.*

```sql
-- Create the table for storing AI logs
create table public.ai_logs (
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
create index idx_ai_logs_city on public.ai_logs(city_name);
create index idx_ai_logs_created_at on public.ai_logs(created_at desc);
```

### Step 3: Environment Configuration
Add these variables to `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh... (Use Service Role for server-side logging to bypass RLS)
```

### Step 4: Create Supabase Client
Create `src/lib/supabaseAdmin.ts`. We use a separate "Admin" client for server-side operations to ensure we have write access to the logs table without exposing permissions to the client-side.

```typescript
import { createClient } from '@supabase/supabase-js';

// Only use this on the server!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false, 
      autoRefreshToken: false,
    },
  }
);
```

### Step 5: Create Logger Service
Create `src/services/aiLogger.ts` to abstract the logging logic. This ensures the main API route stays clean.

```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface AILogEntry {
  cityName: string;
  payload: any;
  modelId: string;
  response: any;
  rawText?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTimeMs: number;
}

export async function logAIResponse(entry: AILogEntry) {
  try {
    // Fire-and-forget (don't await this in the critical path if speed is paramount, 
    // but waiting ensures data integrity)
    const { error } = await supabaseAdmin
      .from('ai_logs')
      .insert({
        city_name: entry.cityName,
        input_payload: entry.payload,
        model_id: entry.modelId,
        response_text: entry.response,
        raw_output: entry.rawText,
        token_usage_prompt: entry.tokenUsage?.prompt,
        token_usage_completion: entry.tokenUsage?.completion,
        token_usage_total: entry.tokenUsage?.total,
        processing_time_ms: entry.processingTimeMs
      });

    if (error) {
      console.error("Failed to insert AI log:", error);
    }
  } catch (err) {
    console.error("AI Logging Exception:", err);
  }
}
```

### Step 6: Integration into `narrator/route.ts`
Modify `src/app/api/narrator/route.ts` to wrap the generation logic.

```typescript
import { logAIResponse } from '@/services/aiLogger';

// ... inside POST ...
const startTime = Date.now();

// ... generation logic ...

const result = await model.generateContent(prompt);
// ... processing ...

// LOGGING
// We use `waitUntil` if available on Vercel Edge, or just let it float, 
// but for standard Node runtime we can just call it.
logAIResponse({
    cityName: payload.city.name,
    payload: payload,
    modelId: "gemini-2.0-flash",
    response: briefing, // The parsed JSON
    rawText: text, // The raw string
    tokenUsage: {
        prompt: response.usageMetadata?.promptTokenCount || 0,
        completion: response.usageMetadata?.candidatesTokenCount || 0,
        total: response.usageMetadata?.totalTokenCount || 0
    },
    processingTimeMs: Date.now() - startTime
});

return NextResponse.json(briefing);
```

## 3. Security & Privacy
- **PII**: The weather payload contains no user PII (only city name which is generic).
- **Service Role**: We use the Service Role key. This key must NEVER be exposed to the client. Ensure `src/lib/supabaseAdmin.ts` is never imported by a Client Component.

## 4. Maintenance
- **Retention**: We should implement a cron job or Supabase Edge Function to delete logs older than 90 days if storage becomes an issue.
- **Monitoring**: We can build a simple "Admin Dashboard" later to view these logs in the UI.
