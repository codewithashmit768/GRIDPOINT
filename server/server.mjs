import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/api/ai-insights", async (req, res) => {
  try {
    const {
      adjustedDemand,
      requiredWarehouses,
      recommendedWarehouses,
      warehouseCapacity,
      demandGrowth,
      minimumCost,
    } = req.body;

    const prompt = `
You are an AI warehouse optimization assistant for a project called GridPoint.

Analyze the following warehouse data:

Daily demand: ${adjustedDemand} units
Required warehouses: ${requiredWarehouses}
Recommended warehouses: ${recommendedWarehouses}
Capacity per warehouse: ${warehouseCapacity} units
Demand growth: ${demandGrowth}%
Minimum estimated cost: ₹${minimumCost}

Give a concise business-oriented insight.

Explain:
1. Why the recommended number of warehouses makes sense.
2. The cost situation.
3. The available capacity/safety buffer.
4. What happens if demand increases.

Keep the response between 80 and 120 words.
Do not use markdown headings.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({
      insight: response.text,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error: "Failed to generate AI insights",
    });
  }
});

app.listen(3001, () => {
  console.log("GridPoint AI server running on http://localhost:3001");
});