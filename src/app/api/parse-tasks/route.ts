import { NextRequest, NextResponse } from "next/server";

function parseNotesToTasks(notes: string): { title: string; priority: string; description: string; dueDate: string | null }[] {
  const tasks: { title: string; priority: string; description: string; dueDate: string | null }[] = [];

  // Split by newlines, bullets, semicolons, or numbered items
  const lines = notes
    .split(/\n|;\s*|(?:^|\n)\s*\d+[.)]\s*/g)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 3);

  const verbs = new Set(["schedule", "confirm", "quantify", "prepare", "review", "send", "build", "create",
    "follow", "check", "verify", "contact", "reach", "set", "update", "address", "discuss",
    "assess", "evaluate", "investigate", "resolve", "track", "monitor", "escalate", "share",
    "coordinate", "align", "present", "document", "finalize", "negotiate", "prioritize",
    "launch", "design", "remove", "add", "fix", "run", "pull", "push", "submit", "draft",
    "complete", "respond", "arrange", "map", "outline", "audit", "test", "deploy", "install",
    "configure", "enable", "disable", "export", "import", "migrate", "upsell", "renew",
    "cancel", "approve", "request", "assign", "notify", "escalate", "onboard", "demo"]);

  for (const line of lines) {
    let text = line.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (text.length < 5) continue;

    // Extract dates
    let dueDate: string | null = null;
    const datePatterns = [
      /(?:on|by|before|until)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:on|by|before|until)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:[,]?\s*\d{4})?)/i,
    ];
    for (const pattern of datePatterns) {
      const m = text.match(pattern);
      if (m) {
        try {
          const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
          const dayIdx = dayNames.indexOf(m[1].toLowerCase());
          if (dayIdx >= 0) {
            const now = new Date();
            const diff = (dayIdx - now.getDay() + 7) % 7 || 7;
            const target = new Date(now.getTime() + diff * 86400000);
            dueDate = target.toISOString().split("T")[0];
          } else {
            const parsed = new Date(m[1].replace(/(\d+)(st|nd|rd|th)/, "$1") + " 2026");
            if (!isNaN(parsed.getTime())) dueDate = parsed.toISOString().split("T")[0];
          }
        } catch {}
        break;
      }
    }

    // Priority
    let priority = "P2";
    const lower = text.toLowerCase();
    if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical") || lower.includes("renewal") || lower.includes("risk")) {
      priority = "P1";
    } else if (lower.includes("nice to have") || lower.includes("optional") || lower.includes("low priority")) {
      priority = "P3";
    }

    // Ensure verb-first
    const firstWord = text.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";
    if (!verbs.has(firstWord)) {
      // Try to infer a verb
      if (lower.includes("upsell") || lower.includes("sell")) text = `Upsell: ${text}`;
      else if (lower.includes("meeting") || lower.includes("call")) text = `Prepare for: ${text}`;
      else text = `Complete: ${text}`;
    }

    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1);

    tasks.push({ title: text, priority, description: "", dueDate });
  }

  return tasks;
}

export async function POST(request: NextRequest) {
  try {
    const { notes } = await request.json();
    if (!notes || typeof notes !== "string") {
      return NextResponse.json({ error: "Missing notes" }, { status: 400 });
    }

    const tasks = parseNotesToTasks(notes);
    if (tasks.length === 0) {
      return NextResponse.json({ error: "No actionable items found in notes" }, { status: 400 });
    }

    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
