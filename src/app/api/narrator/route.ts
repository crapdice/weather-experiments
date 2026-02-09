import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prepareNarratorPayload } from "@/utils/narratorPayload";
import { isAdmin as checkAdminStatus } from "@/lib/auth";
import { NARRATOR_PROMPT_TEMPLATE, hydratePrompt } from "@/lib/narrator";
import { logAIResponse } from "@/services/aiLogger";

// 6-Hour Forensic Cache Initialization
const CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 Hours in ms

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

    try {
        const startTime = Date.now();
        const body = await req.json();
        const { city, stats } = body;

        if (!city || !stats) {
            console.error("Narrator API: Missing city or stats in request body");
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        const payload = prepareNarratorPayload(city, stats);
        const userIsAdmin = await checkAdminStatus();

        // Cache Key: City ID + 6-hour epoch bucket
        const bucketIndex = Math.floor(Date.now() / CACHE_DURATION);
        const cacheKey = `${payload.city.name}-${bucketIndex}`;

        // Check Cache (Skip if Admin)
        if (!userIsAdmin) {
            const cached = CACHE.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                console.log(`[CACHE HIT] Delivering forensic briefing for ${payload.city.name} (Bucket: ${bucketIndex})`);
                return NextResponse.json(cached.data);
            }
        } else {
            console.log(`[ADMIN BYPASS] Skipping cache for administrative revalidation on ${payload.city.name}`);
        }

        console.log(`[CACHE MISS] Generating new forensic briefing for ${payload.city.name}`);
        console.log("--- NARRATOR API DEBUG: PAYLOAD ---");
        console.log(JSON.stringify(payload, null, 2));

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        // Hydrate the prompt template with the payload data
        const prompt = hydratePrompt(NARRATOR_PROMPT_TEMPLATE, payload);

        console.log("--- GEMINI PROMPT ---");
        console.log(prompt);

        const result = await model.generateContent(prompt);
        const response = await result.response;

        // Log token usage if available
        if (response.usageMetadata) {
            console.log("--- GEMINI TOKEN USAGE ---");
            console.log(`Prompt Tokens: ${response.usageMetadata.promptTokenCount}`);
            console.log(`Candidates Tokens: ${response.usageMetadata.candidatesTokenCount}`);
            console.log(`Total Tokens: ${response.usageMetadata.totalTokenCount}`);
        }

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

            return NextResponse.json(briefing);
        } catch (parseError) {
            console.error("Narrator API: Failed to parse Gemini response:", text);
            return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Narrator API Error:", error);

        // If we hit a rate limit, return the mock instead of failing for the UI
        if (error.message?.includes("429") || error.message?.includes("Resource exhausted")) {
            console.warn("NARRATOR_API: Rate limit hit. Falling back to MOCK response.");
            const body = await req.json().catch(() => ({}));
            const { city, stats } = body;
            if (city && stats) {
                const payload = prepareNarratorPayload(city, stats);
                return NextResponse.json({
                    ...getMockResponse(payload.city, payload.stats),
                    headline: `[QUOTA_LIMIT] ${payload.stats.dayOfWeek}: ${payload.city.name} Status`
                });
            }
        }

        return NextResponse.json(
            { error: "Failed to generate briefing", details: error.message },
            { status: 500 }
        );
    }
}
