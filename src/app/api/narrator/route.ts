import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "GOOGLE_GEMINI_API_KEY is not configured" },
            { status: 500 }
        );
    }

    try {
        const { city, stats } = await req.json();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
      You are a meteorologist specializing in historical climatology for the weather application "KORD Weather Intelligence". 
      Your goal is to provide context-rich daily briefings that explain the significance of current weather data compared to 80+ years of history.

      INPUT DATA for ${city.name}:
      - Date: ${new Date(stats.currentTempTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      - Current Temp: ${stats.currentTemp}°F
      - Today's Observed High: ${stats.todayMax}°F
      - Today's Observed Low: ${stats.todayMin}°F
      - Historical Percentile: ${stats.todayPercentile}% (where 100% is record warmth)
      - Z-Score: ${stats.zScore} (Standard Deviations from Normal)
      - Analog Year: ${stats.analogYear?.year} (${(stats.analogYear?.similarityScore * 100).toFixed(1)}% similarity)
      - Current Streak: ${stats.currentStreak?.count} days of ${stats.currentStreak?.type}
      - Last Similar Date: ${new Date(stats.lastSimilarDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      
      TASK:
      1. Write a 1-sentence "headline" capturing the most significant anomaly or fact.
      2. Write a 2-sentence "analysis" providing deep historical context. Mention the Z-score and percentile if they are extreme (Z > 1.5 or < -1.5).
      
      OUTPUT FORMAT (Strict JSON):
      {
        "headline": "...",
        "analysis": "..."
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json(JSON.parse(text));
    } catch (error: any) {
        console.error("Narrator Error:", error);
        return NextResponse.json(
            { error: "Failed to generate briefing", details: error.message },
            { status: 500 }
        );
    }
}
