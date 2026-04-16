import * as store from "./store";

interface SeedTask {
  title: string;
  priority?: "P1" | "P2" | "P3";
  description?: string;
}

const SEED_DATA: Record<string, SeedTask[]> = {
  DataRobot: [
    { title: "Review latest call notes and extract action items", priority: "P2" },
    { title: "Design new ad images and creative variants", priority: "P2" },
    { title: "Launch new campaigns using updated creative", priority: "P2" },
    { title: "Respond to open Slack messages from DataRobot team", priority: "P1" },
    { title: "Build and launch ChatGPT-themed ad experiments", priority: "P2" },
  ],
  Backbase: [
    { title: "Audit each reporting gap and confirm whether it's a real platform limitation or a config issue", priority: "P1", description: "Go through every item flagged as 'can't be done' and verify in-platform. Document which are real gaps vs. fixable." },
  ],
  Ambient: [
    { title: "Review latest call recording and pull out key notes", priority: "P2" },
    { title: "Send EBR request email to Ambient stakeholders", priority: "P1" },
    { title: "Prepare webinar slide deck and talking points", priority: "P2" },
    { title: "Build presentation slides for Gil's review", priority: "P2" },
    { title: "Schedule a 30-min sync with Alberto to align on next steps", priority: "P1" },
  ],
  Parity: [
    { title: "Read through the shared document and summarize key points", priority: "P2" },
    { title: "Research dynamic ad creative capabilities and report findings", priority: "P2" },
  ],
  Crusoe: [
    { title: "Set up Facebook NVIDIA ad campaigns with approved creative", priority: "P2" },
    { title: "Apply the 4 requested adjustments to active campaigns", priority: "P1" },
  ],
  Monotype: [
    { title: "Review and finalize the Monotype renewal contract", priority: "P1" },
  ],
  Motus: [
    { title: "Build demo campaigns to showcase platform capabilities", priority: "P2" },
    { title: "Create brand awareness campaign structure and targeting", priority: "P2" },
    { title: "Launch production campaigns with full targeting and budget", priority: "P1" },
    { title: "Build out Trends Report campaign with proper experiment setup", priority: "P2" },
    { title: "Review current total spend ($125k) and flag any pacing issues", priority: "P3" },
  ],
  Zoom: [
    { title: "Verify audiences are syncing correctly between Metadata and SFDC", priority: "P2" },
    { title: "Remove CX audiences from active targeting", priority: "P1" },
    { title: "Prepare renewal proposal and schedule renewal conversation", priority: "P1" },
  ],
  SafelyYou: [
    { title: "QA current campaign setup and flag anything off-track", priority: "P2" },
  ],
  DT: [
    { title: "Run Crystal comparison analysis and document findings", priority: "P2" },
  ],
  Planful: [
    { title: "Pull performance report and package for renewal discussion", priority: "P1" },
  ],
  HSD: [
    { title: "Inspect account setup and identify optimization opportunities", priority: "P2" },
  ],
};

const GENERAL_TASKS: SeedTask[] = [
  { title: "Map out the LinkedIn Manus automation flow end-to-end", priority: "P2" },
  { title: "Submit outstanding expense reports", priority: "P3" },
];

export function seedTasks(): { customers: number; tasks: number } {
  const data = store.getAll();
  const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

  let taskCount = 0;

  for (const [customerName, tasks] of Object.entries(SEED_DATA)) {
    let customer = data.customers.find((c) => normalize(c.name) === normalize(customerName));

    if (!customer) {
      customer = store.addCustomer(customerName);
    }

    const existingTasks = store.getAll().tasks.filter((t) => t.customerId === customer!.id);
    const existingTitles = new Set(existingTasks.map((t) => normalize(t.title)));

    for (const task of tasks) {
      if (existingTitles.has(normalize(task.title))) continue;
      store.addTask(customer.id, task.title, {
        priority: task.priority || "P2",
        description: task.description,
      });
      taskCount++;
    }
  }

  // General tasks go under a "_General" customer
  if (GENERAL_TASKS.length > 0) {
    let general = data.customers.find((c) => normalize(c.name) === "general");
    if (!general) {
      general = store.addCustomer("_General");
    }
    const existingTasks = store.getAll().tasks.filter((t) => t.customerId === general!.id);
    const existingTitles = new Set(existingTasks.map((t) => normalize(t.title)));
    for (const task of GENERAL_TASKS) {
      if (existingTitles.has(normalize(task.title))) continue;
      store.addTask(general.id, task.title, { priority: task.priority });
      taskCount++;
    }
  }

  return { customers: Object.keys(SEED_DATA).length + 1, tasks: taskCount };
}
