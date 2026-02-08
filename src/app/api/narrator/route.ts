import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { prepareNarratorPayload } from "@/utils/narratorPayload";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();

    if (apiKey) {
        console.log(`[DEBUG] API Key detected. Length: ${apiKey.length}. Starts with: ${apiKey.substring(0, 4)}... Ends with: ...${apiKey.substring(apiKey.length - 4)}`);
    }

    if (!apiKey) {
        return NextResponse.json(
            { error: "GOOGLE_GEMINI_API_KEY is not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { city, stats } = body;

        if (!city || !stats) {
            console.error("Narrator API: Missing city or stats in request body");
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        const payload = prepareNarratorPayload(city, stats);

        console.log("--- NARRATOR API DEBUG: PAYLOAD ---");
        console.log(JSON.stringify(payload, null, 2));

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
      1. TONE: Honest, relatable, and user-centric weather expert.
      2. TEMPORAL SENTIMENT: Priority 1 is the NOW. If the user is in a long cold streak (>10 days), do not describe the winter as "warm" or "moderate" just because December was hot. Acknowledge that the current pattern is defining the seasonal feel.
      3. DATA BENCHMARKS: Use the "Historical Medians" to judge if we are truly wet or snowy. If Snow Total is less than Median, do NOT say we are above average.
      4. HUMAN IMPACT: Specifically mention how today's temps compare to the "Climatological Normal." e.g. "We are shivering 6 degrees below what is typical for this date."
      5. DAYLIGHT CYCLE: You MUST explicitly include the "Sunrise" and "Sunset" times provided in the ANALYSIS section.
      6. FORENSIC FORECAST: Use the data from the Analog Year (${payload.stats.analogYear}) to provide a "Forensic Lookahead" for the next week. Treat it as a "pattern-matched projection" rather than a 100% guarantee.
      7. BE HONEST: If the data shows a 6-degree drop from last year, don't minimize it.
      
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
            return NextResponse.json(JSON.parse(text));
        } catch (parseError) {
            console.error("Narrator API: Failed to parse Gemini response:", text);
            return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Narrator API Error:", error);
        return NextResponse.json(
            { error: "Failed to generate briefing", details: error.message },
            { status: 500 }
        );
    }
}
