import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { transactions, question } = await req.json();

  const systemPrompt = `
You are a helpful personal finance assistant. The user will send you a list of their bank transactions, and you must answer their question using that data. 
Each transaction has: date, description, amount, category.

Be accurate, polite, and explain in plain language.
`;

  const userPrompt = `
Question: ${question}

Transactions:
${JSON.stringify(transactions, null, 2)}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const answer = response.choices[0].message.content;
  return NextResponse.json({ answer });
}
