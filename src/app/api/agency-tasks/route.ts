import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const AGENCY_BASE = "https://api.agency.inc/external";

const DOMAIN_MAP: Record<string, string> = {
  zoom: "zoom.us",
  crusoe: "crusoe.ai",
  "imagine software": "imaginesoftware.com",
  "n-able": "n-able.com",
  docebo: "docebo.com",
  monotype: "monotype.com",
  motus: "motus.com",
  planful: "planful.com",
  tvscientific: "tvscientific.com",
  "direct travel": "dt.com",
  ambient: "ambient.ai",
  postscript: "postscript.io",
  extrahop: "extrahop.com",
  hopskipdrive: "hopskipdrive.com",
  safelyyou: "safely-you.com",
  datarobot: "datarobot.com",
  touchlight: "touchlight.com",
  faceup: "faceup.com",
  pixaera: "pixaera.com",
  workvivo: "workvivo.com",
  "dsl digital": "dsldigital.com",
  yotpo: "yotpo.com",
  monograph: "monograph.io",
  swap: "swap.com",
  backbase: "backbase.com",
  parity: "parity.com",
};

function getDomain(name: string): string | null {
  return DOMAIN_MAP[name.toLowerCase().trim()] || null;
}

async function fetchAgencyOverview(domain: string, token: string): Promise<string | null> {
  try {
    const resp = await fetch(`${AGENCY_BASE}/v1/accounts/domain:${domain}/overview`, {
      headers: { "X-API-Key": token },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const d = json.data || json;
    if (d.status !== "available" || !d.content) return null;
    return d.content;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
  const agencyToken = process.env.AGENCY_API_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!agencyToken) return NextResponse.json({ error: "AGENCY_API_TOKEN not configured" }, { status: 500 });
  if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const { customerName } = await request.json();
  if (!customerName) return NextResponse.json({ error: "Missing customerName" }, { status: 400 });

  const domain = getDomain(customerName);
  if (!domain) return NextResponse.json({ error: `No domain mapping for "${customerName}"` }, { status: 404 });

  const overview = await fetchAgencyOverview(domain, agencyToken);
  if (!overview) return NextResponse.json({ error: `No Agency overview available for ${customerName}` }, { status: 404 });

  const client = new Anthropic({ apiKey: anthropicKey });

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a task extraction assistant. Extract actionable to-do items from this Agency account overview for "${customerName}".

This is an AI-generated summary of recent calls, emails, and account activity. Focus on:
- Follow-up items mentioned in call notes
- Action items assigned to the CSM/account owner
- Pending deliverables or commitments
- Renewal-related tasks
- Campaign or technical tasks mentioned
- Anything that needs attention or has a deadline

Rules:
- Each task MUST start with an action verb (Review, Build, Send, Schedule, Create, Follow up, Prepare, etc.)
- Each task should be self-contained — someone reading it should know exactly what to do
- Include specific details (names, dates, products, numbers) from the overview
- Assign priority: P1 (urgent/blocking/renewal-related), P2 (normal follow-ups), P3 (nice-to-have)
- If a date is mentioned or implied, include it as dueDate in ISO format (YYYY-MM-DD), otherwise null
- Don't create tasks for things that are clearly already done/completed
- Return ONLY valid JSON array, no markdown, no explanation

Return format:
[
  { "title": "verb-first task title", "priority": "P1", "description": "optional extra context", "dueDate": null }
]

Agency Overview:
${overview}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 500 });
  const tasks = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ tasks, source: "agency", overview: overview.slice(0, 500) + "..." });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
