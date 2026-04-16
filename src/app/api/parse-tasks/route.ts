import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { notes, customerName } = await request.json();
  if (!notes || typeof notes !== "string") {
    return NextResponse.json({ error: "Missing notes" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a task extraction assistant. Extract actionable to-do items from these call notes for the customer "${customerName || "Unknown"}".

Rules:
- Each task MUST start with an action verb (Review, Build, Send, Schedule, Create, Follow up, Prepare, etc.)
- Each task should be self-contained — someone reading it should know exactly what to do without needing additional context
- Include specific details from the notes (names, numbers, dates, products mentioned)
- Assign priority: P1 (urgent/blocking), P2 (normal), P3 (low/nice-to-have)
- If a due date is mentioned or implied, include it as an ISO date string (YYYY-MM-DD), otherwise null
- Return ONLY valid JSON, no markdown, no explanation

Return format:
[
  { "title": "verb-first task title", "priority": "P1", "description": "optional extra context", "dueDate": null }
]

Call notes:
${notes}`,
      },
    ],
  });

  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 500 });
    }
    const tasks = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json({ error: "Failed to parse response", details: String(e) }, { status: 500 });
  }
}
