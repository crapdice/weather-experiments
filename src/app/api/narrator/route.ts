import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prepareNarratorPayload } from "@/utils/narratorPayload";
import { isAdmin as checkAdminStatus } from "@/lib/auth";
import { NARRATOR_PROMPT_TEMPLATE, hydratePrompt } from "@/lib/narrator";
import { logAIResponse } from "@/services/aiLogger";

// 6-Hour Forensic Cache Initialization
const CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 Hours in ms

/**
 * Calculates a stable cache bucket index based on the city's local time.
 * This ensures that "Morning" in Chicago is always the same bucket regardless of the server's UTC drift.
 */
function getLocalBucketIndex(timezone: string = 'America/Chicago'): string {
    const now = new Date();
    // Format to a string that respects the city's local date/hour
    const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
    const localHour = parseInt(now.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }));

    // Bucket 0: 00-05, Bucket 1: 06-11, Bucket 2: 12-17, Bucket 3: 18-23
    const bucket = Math.floor(localHour / 6);
    return `${localDateStr}-B${bucket}`;
}

export async function POST(req: NextRequest) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();


    if (!apiKey && process.env.MOCK_NARRATOR !== "true") {
        return NextResponse.json(
            { error: "GOOGLE_GEMINI_API_KEY is not configured" },
            { status: 500 }
        );
    }

    const getMockResponse = (city: any, stats: any) => {
        return {
            headline: `[MOCK] ${stats.dayOfWeek}: ${city.name} Weather Deep-Dive`,
            analysis: `This is a mock briefing for ${city.name} on ${stats.date}. The Gemini API is currently in SLEEP mode to conserve your token quota. In a production environment, this would be a forensic analysis comparing today's ${stats.currentTemp}°F to the ${stats.analogYear} pattern. Today is ${stats.dayOfWeek}, so we're keeping it ${stats.dayOfWeek === 'MONDAY' ? 'focused and punchy' : 'descriptive and analytical'}. Enjoy the ${stats.sunrise} sunrise!`
        };
    };

    if (process.env.MOCK_NARRATOR === "true") {
        try {
            const body = await req.json();
            const { city, stats } = body;
            const payload = prepareNarratorPayload(city, stats);
            return NextResponse.json(getMockResponse(payload.city, payload.stats));
        } catch (e) {
            return NextResponse.json({ error: "Mock failure" }, { status: 500 });
        }
    }

    let body: any;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { city, stats } = body;

    if (!city || !stats) {
        console.error("Narrator API: Missing city or stats in request body");
        return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    try {
        const startTime = Date.now();
        const payload = prepareNarratorPayload(city, stats);
        const userIsAdmin = await checkAdminStatus();

        // Stable Cache Key: City ID + Local Time Bucket
        const bucketId = getLocalBucketIndex(city?.timezone || 'America/Chicago');
        const cacheKey = `${payload.city.name}-${bucketId}`;

        // Check Cache (Skip if Admin)
        if (!userIsAdmin) {
            const cached = CACHE.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                console.log(`[CACHE HIT] Delivering forensic briefing for ${payload.city.name} (Bucket: ${bucketId})`);
                return NextResponse.json(cached.data, {
                    headers: {
                        'Cache-Control': 'no-store, must-revalidate',
                        'X-Cache': 'HIT',
                        'X-Bucket-ID': bucketId
                    }
                });
            }
        } else {
            console.log(`[ADMIN BYPASS] Skipping cache for administrative revalidation on ${payload.city.name}`);
        }

        console.log(`[CACHE MISS] Generating new forensic briefing for ${payload.city.name}`);

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.8,
                frequencyPenalty: 0.9,
                presencePenalty: 0.3,
                maxOutputTokens: 500,
            }
        });

        // Hydrate the prompt template with the payload data
        const prompt = hydratePrompt(NARRATOR_PROMPT_TEMPLATE, payload);

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let text = response.text();
        // Clean up text in case Gemini wraps it in markdown blocks
        text = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

        try {
            const briefing = JSON.parse(text);

            // Store in Cache
            CACHE.set(cacheKey, {
                data: briefing,
                timestamp: Date.now()
            });

            // LOGGING: Asynchronous fire-and-forget
            logAIResponse({
                cityName: payload.city.name,
                payload: payload,
                modelId: "gemini-2.0-flash",
                response: briefing,
                rawText: text,
                tokenUsage: {
                    prompt: response.usageMetadata?.promptTokenCount || 0,
                    completion: response.usageMetadata?.candidatesTokenCount || 0,
                    total: response.usageMetadata?.totalTokenCount || 0
                },
                processingTimeMs: Date.now() - startTime
            });

            return NextResponse.json(briefing, {
                headers: {
                    'Cache-Control': 'no-store, must-revalidate',
                    'X-Cache': 'MISS',
                    'X-Bucket-ID': bucketId
                }
            });
        } catch (parseError) {
            console.error("Narrator API: Failed to parse Gemini response:", text);
            return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Narrator API Error:", error);

        // If we hit a rate limit, return the mock instead of failing for the UI
        if (error.message?.includes("429") || error.message?.includes("Resource exhausted")) {
            console.warn("NARRATOR_API: Rate limit hit. Falling back to MOCK response.");
            const payload = prepareNarratorPayload(city, stats);
            return NextResponse.json({
                ...getMockResponse(payload.city, payload.stats),
                headline: `[QUOTA_LIMIT] ${payload.stats.dayOfWeek}: ${payload.city.name} Status`
            });
        }

        return NextResponse.json(
            { error: "Failed to generate briefing", details: error.message },
            { status: 500 }
        );
    }
}
