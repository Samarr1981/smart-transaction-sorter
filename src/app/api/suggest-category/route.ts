import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: Split array into chunks
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

// Create GPT prompt for a given chunk of descriptions
function buildPrompt(descriptions: string[]): string {
  return `
You are a transaction categorization engine. Your job is to assign one of the following strict categories to each description below:

- Food & Drink
- Shopping
- Entertainment
- Transport
- Groceries
- Utilities
- Rent
- Travel
- Bills
- Services
- Income
- Other

Only respond with a pure JSON array of categories. Do not explain anything.

Input:
${JSON.stringify(descriptions)}

Output:
`;
}

export async function POST(req: Request) {
  const { descriptions } = await req.json();

  if (!Array.isArray(descriptions)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const chunks = chunkArray<string>(descriptions, 10); // smaller batches = better accuracy
  let allCategories: string[] = [];

  try {
    for (const chunk of chunks) {
      const prompt = buildPrompt(chunk);

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.choices[0].message.content || "";
      const jsonStart = raw.indexOf("[");
      const json = raw.slice(jsonStart).trim();

      const chunkCategories = JSON.parse(json);
      allCategories.push(...chunkCategories);
    }

    return NextResponse.json({ suggestions: allCategories });
  } catch (err) {
    console.error("❌ GPT categorization error:", err);
    return NextResponse.json({ suggestions: [], error: "GPT failed to categorize." }, { status: 500 });
  }
}
