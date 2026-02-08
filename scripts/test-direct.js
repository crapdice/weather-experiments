require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testConnection() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GOOGLE_GEMINI_API_KEY not found in .env");
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using 2.0-flash as seen in the model list
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Attempting direct connection to Gemini 2.0 Flash...");

        const result = await model.generateContent("ping");
        const response = await result.response;
        const text = response.text();

        console.log("--- SUCCESS ---");
        console.log("Response from Gemini 2.0: " + text.trim());
    } catch (error) {
        console.error("--- FAILED ---");
        console.error(error.message);
    }
}

testConnection();
