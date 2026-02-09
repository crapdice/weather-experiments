
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
    // If credentials are missing, skip logging to avoid crashing the request
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')) {
        console.debug('[AI Logger] Skipping log due to missing credentials');
        return;
    }

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
