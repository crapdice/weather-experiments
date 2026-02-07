const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testConnection() {
    const apiKey = "AIzaSyDn7ib6fEvBj25HLklYFTwUP3axR4WLVCs";

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
