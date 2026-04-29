import type { AppData, Customer, CustomerMeta, Task, Priority, Status, TaskSource, TimeTag } from "./types";

const STORAGE_KEY = "thetodo-data";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadData(): AppData {
  if (typeof window === "undefined") return { customers: [], tasks: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {}
  return { customers: [], tasks: [] };
}

function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAll(): AppData {
  return loadData();
}

function generateColor(index: number): string {
  const hue = (index * 137.508) % 360; // golden angle for max spread
  return `hsl(${Math.round(hue)}, 65%, 45%)`;
}

export function addCustomer(name: string): Customer {
  const data = loadData();
  const customer: Customer = {
    id: generateId(),
    name,
    color: generateColor(data.customers.length),
    createdAt: new Date().toISOString(),
  };
  data.customers.push(customer);
  saveData(data);
  return customer;
}

export function updateCustomer(id: string, patch: Partial<Pick<Customer, "name" | "color">>): void {
  const data = loadData();
  const c = data.customers.find((c) => c.id === id);
  if (c) {
    if (patch.name !== undefined) c.name = patch.name;
    if (patch.color !== undefined) c.color = patch.color;
    saveData(data);
  }
}

export function reorderCustomers(orderedIds: string[]): void {
  const data = loadData();
  const map = new Map(data.customers.map((c) => [c.id, c]));
  const reordered: typeof data.customers = [];
  for (const id of orderedIds) {
    const c = map.get(id);
    if (c) reordered.push(c);
  }
  for (const c of data.customers) {
    if (!orderedIds.includes(c.id)) reordered.push(c);
  }
  data.customers = reordered;
  saveData(data);
}

export function deleteCustomer(id: string): void {
  const data = loadData();
  data.customers = data.customers.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.customerId !== id);
  saveData(data);
}

export function addTask(customerId: string, title: string, opts?: { description?: string; priority?: Priority; dueDate?: string | null; source?: TaskSource }): Task {
  const data = loadData();
  const customerTasks = data.tasks.filter((t) => t.customerId === customerId);
  const task: Task = {
    id: generateId(),
    customerId,
    title,
    description: opts?.description || "",
    priority: opts?.priority || "P2",
    status: "todo",
    dueDate: opts?.dueDate || null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    order: customerTasks.length,
    source: opts?.source || "manual",
    timeTag: null,
  };
  data.tasks.push(task);
  saveData(data);
  return task;
}

export function updateTask(id: string, patch: Partial<Pick<Task, "title" | "description" | "priority" | "status" | "dueDate" | "order" | "timeTag" | "customerId">>): void {
  const data = loadData();
  const t = data.tasks.find((t) => t.id === id);
  if (t) {
    if (patch.title !== undefined) t.title = patch.title;
    if (patch.description !== undefined) t.description = patch.description;
    if (patch.priority !== undefined) t.priority = patch.priority;
    if (patch.dueDate !== undefined) t.dueDate = patch.dueDate;
    if (patch.order !== undefined) t.order = patch.order;
    if (patch.timeTag !== undefined) t.timeTag = patch.timeTag;
    if (patch.customerId !== undefined) t.customerId = patch.customerId;
    if (patch.status !== undefined) {
      t.status = patch.status;
      t.completedAt = patch.status === "done" ? new Date().toISOString() : null;
    }
    saveData(data);
  }
}

export async function refreshScoresFromMSD(msdUrl: string): Promise<number> {
  const resp = await fetch(`${msdUrl}/api/customers-export`);
  if (!resp.ok) throw new Error(`MSD API error: ${resp.status}`);
  const json = await resp.json();
  const msdCustomers: { name: string; owner: string | null; stage: string | null; quarter: string | null; saasStartingARR: number; totalStartingRevenue: number; contractStartDate: string | null; productType: string | null; healthScore: number; healthLabel: string; healthColor: string }[] = json.customers || [];

  const data = loadData();
  const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
  const msdMap = new Map(msdCustomers.map((mc) => [normalize(mc.name), mc]));

  let updated = 0;
  for (const c of data.customers) {
    const mc = msdMap.get(normalize(c.name));
    if (!mc) continue;
    const newMeta: CustomerMeta = {
      owner: mc.owner,
      stage: mc.stage,
      quarter: mc.quarter,
      saasStartingARR: mc.saasStartingARR,
      totalStartingRevenue: mc.totalStartingRevenue,
      contractStartDate: mc.contractStartDate,
      productType: mc.productType,
      healthScore: mc.healthScore,
      healthLabel: mc.healthLabel,
      healthColor: mc.healthColor,
      pmm: c.meta?.pmm || null,
    };
    c.meta = newMeta;
    updated++;
  }

  if (updated > 0) saveData(data);
  return updated;
}

export function deleteTask(id: string): void {
  const data = loadData();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  saveData(data);
}

