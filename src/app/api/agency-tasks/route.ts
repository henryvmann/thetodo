import { NextRequest, NextResponse } from "next/server";

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

// Extract action items from Agency markdown overview without AI.
// Agency overviews use "- **Verb ..." bullet points for action items.
function parseOverviewToTasks(overview: string, customerName: string): { title: string; priority: string; description: string; dueDate: string | null }[] {
  const tasks: { title: string; priority: string; description: string; dueDate: string | null }[] = [];

  // Split into bullet points (Agency uses "- " for action items)
  const bullets = overview.split(/\n/).filter((line) => /^-\s/.test(line.trim()));

  for (const bullet of bullets) {
    // Strip markdown: bold, links, refs
    let text = bullet
      .replace(/^-\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
      .replace(/\(ref:[^)]+\)/g, "")
      .trim();

    if (text.length < 10) continue;

    // Extract dates (April 21st, May 1st, April 30th, etc.)
    let dueDate: string | null = null;
    const dateMatch = text.match(/(?:before|by|until|deadline[:]?)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:[,]?\s*\d{4})?)/i);
    if (dateMatch) {
      try {
        const parsed = new Date(dateMatch[1].replace(/(\d+)(st|nd|rd|th)/, "$1") + " 2026");
        if (!isNaN(parsed.getTime())) {
          dueDate = parsed.toISOString().split("T")[0];
        }
      } catch {}
    }

    // Determine priority from keywords
    let priority = "P2";
    const lower = text.toLowerCase();
    if (lower.includes("renewal") || lower.includes("urgent") || lower.includes("risk") || lower.includes("deadline") || lower.includes("before") || lower.includes("close date")) {
      priority = "P1";
    } else if (lower.includes("nice to have") || lower.includes("optional") || lower.includes("consider")) {
      priority = "P3";
    }

    // Ensure it starts with a verb — if not, prepend "Follow up on"
    const firstWord = text.split(/\s+/)[0]?.toLowerCase() || "";
    const verbs = new Set(["schedule", "confirm", "quantify", "prepare", "review", "send", "build", "create",
      "follow", "check", "verify", "contact", "reach", "set", "update", "address", "discuss",
      "assess", "evaluate", "investigate", "resolve", "track", "monitor", "escalate", "share",
      "coordinate", "align", "present", "document", "finalize", "negotiate", "prioritize"]);
    if (!verbs.has(firstWord)) {
      text = `Follow up on: ${text}`;
    }

    // Split very long items — keep main title short, rest goes to description
    let title = text;
    let description = "";
    const sinceIdx = text.search(/,\s*(since|as|because|given|noting)/i);
    if (sinceIdx > 30) {
      title = text.slice(0, sinceIdx).trim();
      description = text.slice(sinceIdx + 1).trim();
    } else if (text.length > 120) {
      const splitAt = text.lastIndexOf(" ", 100);
      if (splitAt > 40) {
        title = text.slice(0, splitAt).trim();
        description = text.slice(splitAt).trim();
      }
    }

    tasks.push({ title, priority, description, dueDate });
  }

  // If no bullets found, try to extract from the paragraph text
  if (tasks.length === 0) {
    const sentences = overview.split(/[.!]\s+/).filter((s) => s.length > 20);
    for (const s of sentences.slice(0, 5)) {
      const clean = s.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      if (clean.length < 15) continue;
      tasks.push({
        title: `Review: ${clean.slice(0, 100)}`,
        priority: "P2",
        description: clean.length > 100 ? clean : "",
        dueDate: null,
      });
    }
  }

  return tasks;
}

export async function POST(request: NextRequest) {
  try {
    const agencyToken = process.env.AGENCY_API_TOKEN;
    if (!agencyToken) return NextResponse.json({ error: "AGENCY_API_TOKEN not configured" }, { status: 500 });

    const { customerName } = await request.json();
    if (!customerName) return NextResponse.json({ error: "Missing customerName" }, { status: 400 });

    const domain = getDomain(customerName);
    if (!domain) return NextResponse.json({ error: `No domain mapping for "${customerName}"` }, { status: 404 });

    const overview = await fetchAgencyOverview(domain, agencyToken);
    if (!overview) return NextResponse.json({ error: `No Agency overview available for ${customerName}` }, { status: 404 });

    const tasks = parseOverviewToTasks(overview, customerName);
    return NextResponse.json({ tasks, source: "agency" });

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
