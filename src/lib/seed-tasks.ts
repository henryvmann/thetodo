import type { CustomerMeta, Priority } from "./types";
import * as store from "./store";

interface SeedCustomer {
  name: string;
  meta: CustomerMeta;
}

interface SeedTask {
  customer: string;
  title: string;
  priority: Priority;
  description?: string;
}

interface SeedCustomerWithColor extends SeedCustomer { color: string }

const CUSTOMERS: SeedCustomerWithColor[] = [
  { name: "Zoom", color: "#2563eb", meta: { owner: "Henry Mann", stage: "2. Delivering Value", quarter: "Q3 2027", saasStartingARR: 250000, totalStartingRevenue: 250000, contractStartDate: null, productType: "None", healthScore: 79, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Crusoe", color: "#dc2626", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q1 2028", saasStartingARR: 240000, totalStartingRevenue: 240000, contractStartDate: null, productType: "None", healthScore: 50, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Imagine Software", color: "#7c3aed", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2028", saasStartingARR: 125761, totalStartingRevenue: 125761, contractStartDate: null, productType: "None", healthScore: 18, healthLabel: "Critical", healthColor: "red" } },
  { name: "N-able", color: "#059669", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 101000, totalStartingRevenue: 101000, contractStartDate: null, productType: "None", healthScore: 81, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Docebo", color: "#d97706", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 98000, totalStartingRevenue: 98000, contractStartDate: null, productType: "None", healthScore: 71, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Monotype", color: "#0891b2", meta: { owner: "Henry Mann", stage: "5. Verbal Received", quarter: "Q1 2027", saasStartingARR: 91125, totalStartingRevenue: 91125, contractStartDate: null, productType: "None", healthScore: 86, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Motus", color: "#e11d48", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q1 2028", saasStartingARR: 85000, totalStartingRevenue: 85000, contractStartDate: null, productType: "None", healthScore: 46, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Planful", color: "#4f46e5", meta: { owner: "Henry Mann", stage: "At Risk", quarter: "Q2 2027", saasStartingARR: 82800, totalStartingRevenue: 82800, contractStartDate: null, productType: "None", healthScore: 61, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "tvScientific", color: "#0d9488", meta: { owner: "Henry Mann", stage: "6. In Procurement", quarter: "Q1 2027", saasStartingARR: 70000, totalStartingRevenue: 70000, contractStartDate: null, productType: "None", healthScore: 73, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Direct Travel", color: "#b45309", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 62400, totalStartingRevenue: 62400, contractStartDate: null, productType: "None", healthScore: 80, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Ambient", color: "#9333ea", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 42500, totalStartingRevenue: 42500, contractStartDate: null, productType: "None", healthScore: 45, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Postscript", color: "#16a34a", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 42408, totalStartingRevenue: 42408, contractStartDate: null, productType: "None", healthScore: 80, healthLabel: "Healthy", healthColor: "green" } },
  { name: "ExtraHop", color: "#0284c7", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 36000, totalStartingRevenue: 36000, contractStartDate: null, productType: "None", healthScore: 92, healthLabel: "Healthy", healthColor: "green" } },
  { name: "HopSkipDrive", color: "#c026d3", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 24000, totalStartingRevenue: 24000, contractStartDate: null, productType: "None", healthScore: 63, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "SafelyYou", color: "#65a30d", meta: { owner: "Henry Mann", stage: "Closed Won", quarter: "Q1 2027", saasStartingARR: 21268, totalStartingRevenue: 21268, contractStartDate: null, productType: "None", healthScore: 64, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "DataRobot", color: "#ea580c", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 20000, totalStartingRevenue: 20000, contractStartDate: null, productType: "None", healthScore: 55, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Touchlight", color: "#2dd4bf", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q4 2027", saasStartingARR: 20000, totalStartingRevenue: 20000, contractStartDate: null, productType: "None", healthScore: 56, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "FaceUp", color: "#f43f5e", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 17000, totalStartingRevenue: 17000, contractStartDate: null, productType: "None", healthScore: 67, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Pixaera", color: "#8b5cf6", meta: { owner: "Henry Mann", stage: "2. Delivering Value", quarter: "Q3 2027", saasStartingARR: 12000, totalStartingRevenue: 12000, contractStartDate: null, productType: "None", healthScore: 87, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Workvivo", color: "#a855f7", meta: { owner: "Henry Mann", stage: "2. Delivering Value", quarter: "Q3 2027", saasStartingARR: 12000, totalStartingRevenue: 12000, contractStartDate: null, productType: "None", healthScore: 32, healthLabel: "Critical", healthColor: "red" } },
  { name: "DSL Digital", color: "#475569", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q1 2028", saasStartingARR: 10000, totalStartingRevenue: 10000, contractStartDate: null, productType: "None", healthScore: 17, healthLabel: "Critical", healthColor: "red" } },
  { name: "Yotpo", color: "#ca8a04", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q4 2027", saasStartingARR: 9000, totalStartingRevenue: 9000, contractStartDate: null, productType: "None", healthScore: 63, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Monograph", color: "#334155", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 3000, totalStartingRevenue: 3000, contractStartDate: null, productType: "None", healthScore: 86, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Swap", color: "#06b6d4", meta: { owner: "Henry Mann", stage: "1. Delivering Value", quarter: "Q2 2027", saasStartingARR: 3000, totalStartingRevenue: 3000, contractStartDate: null, productType: "None", healthScore: 86, healthLabel: "Healthy", healthColor: "green" } },
  { name: "Backbase", color: "#be185d", meta: { owner: "Henry Mann", stage: null, quarter: null, saasStartingARR: 0, totalStartingRevenue: 0, contractStartDate: null, productType: null, healthScore: 50, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Parity", color: "#78716c", meta: { owner: "Henry Mann", stage: null, quarter: null, saasStartingARR: 0, totalStartingRevenue: 0, contractStartDate: null, productType: null, healthScore: 50, healthLabel: "At Risk", healthColor: "orange" } },
  { name: "Internal", color: "#1e293b", meta: { owner: "Henry Mann", stage: null, quarter: null, saasStartingARR: 0, totalStartingRevenue: 0, contractStartDate: null, productType: null, healthScore: 0, healthLabel: "Monitor", healthColor: "yellow" } },
  { name: "Henry", color: "#f97316", meta: { owner: "Henry Mann", stage: null, quarter: null, saasStartingARR: 0, totalStartingRevenue: 0, contractStartDate: null, productType: null, healthScore: 0, healthLabel: "Monitor", healthColor: "yellow" } },
];

const TASKS: SeedTask[] = [
  // DataRobot
  { customer: "DataRobot", title: "Review latest call notes and extract action items", priority: "P2" },
  { customer: "DataRobot", title: "Design new ad images and creative variants", priority: "P2" },
  { customer: "DataRobot", title: "Launch new campaigns using updated creative", priority: "P2" },
  { customer: "DataRobot", title: "Respond to open Slack messages from DataRobot team", priority: "P1" },
  { customer: "DataRobot", title: "Build and launch ChatGPT-themed ad experiments", priority: "P2" },
  // Backbase
  { customer: "Backbase", title: "Audit each reporting gap and confirm whether it's a real platform limitation or a config issue", priority: "P1", description: "Go through every item flagged as 'can't be done' and verify in-platform. Document which are real gaps vs. fixable." },
  // Ambient
  { customer: "Ambient", title: "Review latest call recording and pull out key notes", priority: "P2" },
  { customer: "Ambient", title: "Send EBR request email to Ambient stakeholders", priority: "P1" },
  { customer: "Ambient", title: "Prepare webinar slide deck and talking points", priority: "P2" },
  { customer: "Ambient", title: "Build presentation slides for Gil's review", priority: "P2" },
  { customer: "Ambient", title: "Schedule a 30-min sync with Alberto to align on next steps", priority: "P1" },
  // Parity
  { customer: "Parity", title: "Read through the shared document and summarize key points", priority: "P2" },
  { customer: "Parity", title: "Research dynamic ad creative capabilities and report findings", priority: "P2" },
  // Crusoe
  { customer: "Crusoe", title: "Set up Facebook NVIDIA ad campaigns with approved creative", priority: "P2" },
  { customer: "Crusoe", title: "Apply the 4 requested adjustments to active campaigns", priority: "P1" },
  // Monotype
  { customer: "Monotype", title: "Review and finalize the Monotype renewal contract", priority: "P1" },
  // Motus
  { customer: "Motus", title: "Build demo campaigns to showcase platform capabilities", priority: "P2" },
  { customer: "Motus", title: "Create brand awareness campaign structure and targeting", priority: "P2" },
  { customer: "Motus", title: "Launch production campaigns with full targeting and budget", priority: "P1" },
  { customer: "Motus", title: "Build out Trends Report campaign with proper experiment setup", priority: "P2" },
  { customer: "Motus", title: "Review current total spend ($125k) and flag any pacing issues", priority: "P3" },
  // Zoom
  { customer: "Zoom", title: "Verify audiences are syncing correctly between Metadata and SFDC", priority: "P2" },
  { customer: "Zoom", title: "Remove CX audiences from active targeting", priority: "P1" },
  { customer: "Zoom", title: "Prepare renewal proposal and schedule renewal conversation", priority: "P1" },
  // SafelyYou
  { customer: "SafelyYou", title: "QA current campaign setup and flag anything off-track", priority: "P2" },
  // Direct Travel
  { customer: "Direct Travel", title: "Run Crystal comparison analysis and document findings", priority: "P2" },
  // Planful
  { customer: "Planful", title: "Pull performance report and package for renewal discussion", priority: "P1" },
  // HopSkipDrive
  { customer: "HopSkipDrive", title: "Inspect account setup and identify optimization opportunities", priority: "P2" },
  // Internal
  { customer: "Internal", title: "Map out the LinkedIn Manus automation flow end-to-end", priority: "P2" },
  // Henry (personal / work-related)
  { customer: "Henry", title: "Submit outstanding expense reports", priority: "P3" },
];

export function seedIfEmpty(): boolean {
  const data = store.getAll();
  if (data.customers.length > 0 || data.tasks.length > 0) return false;

  const customerMap = new Map<string, string>(); // name → id

  // Create all customers
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = store.addCustomer(CUSTOMERS[i].name);
    store.updateCustomer(c.id, { color: CUSTOMERS[i].color });
    // Attach meta by re-saving through raw localStorage
    const d = store.getAll();
    const found = d.customers.find((x) => x.id === c.id);
    if (found) {
      found.meta = CUSTOMERS[i].meta;
      localStorage.setItem("thetodo-data", JSON.stringify(d));
    }
    customerMap.set(CUSTOMERS[i].name, c.id);
  }

  // Create tasks
  for (const t of TASKS) {
    const custId = customerMap.get(t.customer);
    if (!custId) continue;
    store.addTask(custId, t.title, {
      priority: t.priority,
      description: t.description,
    });
  }

  return true;
}
