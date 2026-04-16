import * as store from "./store";

interface SeedTask {
  title: string;
  priority?: "P1" | "P2" | "P3";
  description?: string;
}

const SEED_DATA: Record<string, SeedTask[]> = {
  DataRobot: [
    { title: "Images, Ads, check call notes", priority: "P2" },
    { title: "New Creative", priority: "P2" },
    { title: "New Campaigns", priority: "P2" },
    { title: "Slack Messages", priority: "P1" },
    { title: "ChatGPT Ads", priority: "P2" },
  ],
  Backbase: [
    { title: "Verify all reporting gaps are real", description: "Make sure that all reporting that we say can't be done actually can't be done", priority: "P1" },
  ],
  Ambient: [
    { title: "Check call for notes", priority: "P2" },
    { title: "Send out EBR Request", priority: "P1" },
    { title: "Webinar Prep", priority: "P2" },
    { title: "Slides for Gil", priority: "P2" },
    { title: "Schedule time with Alberto", priority: "P1" },
  ],
  Parity: [
    { title: "Read the document", priority: "P2" },
    { title: "Find out about dynamic ad creative", priority: "P2" },
  ],
  Crusoe: [
    { title: "Facebook NVIDIA ads", priority: "P2" },
    { title: "Make 4 campaign adjustments", priority: "P1" },
  ],
  Monotype: [
    { title: "Contract", priority: "P1" },
  ],
  Motus: [
    { title: "Demo Campaigns", priority: "P2" },
    { title: "Brand Awareness Campaigns", priority: "P2" },
    { title: "Build out actual campaigns", priority: "P1" },
    { title: "Build out Trends Report Campaign", priority: "P2" },
    { title: "Review total spend ($125k)", priority: "P3" },
  ],
  Zoom: [
    { title: "Audiences created in Metadata/SFDC", priority: "P2" },
    { title: "Removal of CX audiences", priority: "P1" },
    { title: "Renewal", priority: "P1" },
  ],
  SafelyYou: [
    { title: "Check work", priority: "P2" },
  ],
  DT: [
    { title: "Crystal Comparison", priority: "P2" },
  ],
  Planful: [
    { title: "Report for Renewal", priority: "P1" },
  ],
  HSD: [
    { title: "Inspect", priority: "P2" },
  ],
};

const GENERAL_TASKS: SeedTask[] = [
  { title: "LinkedIn Manus Flow", priority: "P2" },
  { title: "Expenses", priority: "P3" },
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
