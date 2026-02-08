import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prepareNarratorPayload } from "@/utils/narratorPayload";

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
        const body = await req.json();
        const { city, stats } = body;

        if (!city || !stats) {
            console.error("Narrator API: Missing city or stats in request body");
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        const payload = prepareNarratorPayload(city, stats);

        // Cache Key: City ID + 6-hour epoch bucket
        const bucketIndex = Math.floor(Date.now() / CACHE_DURATION);
        const cacheKey = `${payload.city.name}-${bucketIndex}`;

        // Check Cache
        const cached = CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            console.log(`[CACHE HIT] Delivering forensic briefing for ${payload.city.name} (Bucket: ${bucketIndex})`);
            return NextResponse.json(cached.data);
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

        const prompt = `
      You are a friendly and knowledgeable local weather expert. Your goal is to tell a clear, interesting story about today's weather compared to the last 80 years of history. 
      
      Avoid arcane meteorological jargon. Use plain English that a regular person would understand and find interesting.

      CORE DATA FOR ${payload.city.name}:
      - Current State: ${payload.stats.currentTemp}°F on ${payload.stats.date}
      - Extremes: High ${payload.stats.todayMax}°F / Low ${payload.stats.todayMin}°F
      - Climatological Normal: Normally we'd see High ${payload.stats.normalHigh?.toFixed(1)}°F / Low ${payload.stats.normalLow?.toFixed(1)}°F
      - Wind: ${payload.stats.currentWind} mph (Gusts ${payload.stats.currentGust} mph)
      - Today's Accumulation: Rain ${payload.stats.todayRain}" / Snow ${payload.stats.todaySnow}"
      - Daylight: Sunrise ${payload.stats.sunrise} / Sunset ${payload.stats.sunset}
      - Day of Week: ${payload.stats.dayOfWeek}
      - Analog Year: ${payload.stats.analogYear}
      - Streak: ${payload.stats.streakCount}-day streak of ${payload.stats.streakType}
      
      SEASON-TO-DATE ACCUMULATION (Dec 1 - Today):
      - Rain Total: ${payload.seasonal.rainTotal}" (Historical Median for this date: ${payload.seasonal.rainMedian}")
      - Snow Total: ${payload.seasonal.snowTotal}" (Historical Median for this date: ${payload.seasonal.snowMedian}")
      ${payload.seasonal.comparisons.map(c => `- ${c.metric}: ${c.currentValue}${c.unit} (Rank #${c.rank} of ${c.totalYears})`).join('\n')}

      COMPARED TO PREVIOUS YEAR (YoY Lookback):
      ${payload.lookbackYoY.map(l => `- ${l.period}: ${l.delta > 0 ? '+' : ''}${l.delta.toFixed(2)}°F vs last year (Curr: ${l.current.toFixed(1)}°F vs Prev: ${l.previous.toFixed(1)}°F)`).join('\n')}

      FORENSIC PROJECTION (Based on Similar Pattern in ${payload.stats.analogYear}):
      ${payload.stats.analogForecast?.map(f => `- ${f.date}: High ${f.high}°F / Low ${f.low}°F`).join('\n')}

      NARRATIVE GUIDELINES:
      1. TONE: Honest, relatable, and user-centric weather expert but lean into your dynamic personality (see list item 11).
      2. TEMPORAL SENTIMENT: Priority 1 is the NOW. If the user is in a long cold streak (>10 days), do not describe the winter as "warm" or "moderate" just because December was hot. Acknowledge that the current pattern is defining the seasonal feel.
      3. DATA BENCHMARKS: Use the "Historical Medians" to judge if we are truly wet or snowy. If Snow Total is less than Median, do NOT say we are above average. But if there is snowfall, you must mention it.
      4. HUMAN IMPACT: Specifically mention how today's temps compare to the "Climatological Normal." e.g. "We are shivering 6 degrees below what is typical for this date."
      5. DAYLIGHT CYCLE: You MUST explicitly include the "Sunrise" and "Sunset" times provided in the ANALYSIS section.
      6. FORENSIC FORECAST: Use the data from the Analog Year (${payload.stats.analogYear}) to provide a "Forensic Lookahead" for the next week. Treat it as a "pattern-matched projection" rather than a 100% guarantee.
      7. BE HONEST: If the data shows a 6-degree drop from last year, don't minimize it.
      8. DAYLIGHT PROGRESS: Frame the daylight data in terms of progress. Mention how much light we've gained since the Winter Solstice.
      9. HUMAN EXPERIENCE: Translate the temperature and wind into a "Human Experience" recommendation. Should I wear layers? Is it a 'good day for a walk' or a 'stay inside with cocoa' kind of day?
      10. HISTORICAL WEIGHT: When a data point ranks in the Top 10 or Bottom 10 of history, treat it as a headline event. Use phrases like 'one for the record books' or 'rare for this time of year' to add weight to the statistics.
      11. DYNAMIC DAILY PERSONALITY: Adjust your tone based on ${payload.stats.dayOfWeek} to match the user's likely headspace:
          - MONDAY (The No-Nonsense Pro): Be brief, high-energy, and focused on the facts. Help them conquer the commute. Provide a general interest topic of conversation for the day.
          - TUESDAY (The Data Nerd): Since users are focused, you can be more "Forensic." Deep-dive into the 2012 Analog Year stats. Tell a joke about why Tuesday sucks. 
          - WEDNESDAY (The Encourager): Acknowledge the midweek slog. Use a bit of wit or a "weather win" to lift the mood. Say something witty about "hump day." 
          - THURSDAY (The Optimist): Start looking ahead. Frame the weather in terms of "weekend potential." Provide a up to date topic in the news.
          - FRIDAY (The Hype-Man): Keep it punchy and celebratory. If the weather is bad, make a joke about it ruining Friday plans otherwise provide an idea on what to do for the weekend.
          - SATURDAY (The Storyteller): Be more descriptive and "knowledgeable expert." Use more adjectives. Reference something that happened this day in history.
          - SUNDAY (The Calm Observer): Use a chill, low-pressure tone. Focus on the sunset and the "wind down." Tell a weather joke. 

      TASK:
      1. HEADLINE: A clear, engaging summary (max 10 words).
      2. ANALYSIS: A friendly 5-6 sentence explanation. Connect today's feels to the bigger seasonal picture. Include the exact sunrise and sunset times. End with a 2-sentence "Forensic Outlook" based on the pattern from ${payload.stats.analogYear}.

      OUTPUT FORMAT (Strict JSON):
      {
        "headline": "...",
        "analysis": "..."
      }
    `;

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
