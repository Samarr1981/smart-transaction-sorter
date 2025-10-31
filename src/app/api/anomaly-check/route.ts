import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { transactions } = await req.json();

  const prompt = `
You are an AI that reviews financial transactions and identifies **anomalies**.

Mark transactions as "unusual" if:
- The amount is unexpectedly large for the category (e.g., $800 food)
- It is an unexpected one-off expense
- It is suspicious or unfamiliar
DO NOT flag:
- Credit card payments
- Rent
- Utilities
- Income or salary
- Recurring charges

Input:
${JSON.stringify(transactions, null, 2)}

Respond with ONLY a JSON array of the **indexes** of unusual transactions, like:
[1, 4, 7]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0].message.content || "";
    const json = raw.slice(raw.indexOf("[")).trim();
    const anomalies = JSON.parse(json);
    return NextResponse.json({ anomalies });
  } catch (err) {
    console.error("GPT Anomaly Error:", err);
    return NextResponse.json({ anomalies: [] });
  }
}
