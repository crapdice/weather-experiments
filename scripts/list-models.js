const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_GEMINI_API_KEY not found in .env");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // There isn't a direct listModels in the SDK for client side, but we can try to find valid models.
        // Actually, the best way in Node is to use the Discovery API or just try 'gemini-1.5-flash' vs 'gemini-1.5-flash-001' etc.
        // Let's use the fetch API to call the models endpoint directly.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
