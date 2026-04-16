import type { AppData, Customer, Task, Priority, Status } from "./types";

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

export function addCustomer(name: string): Customer {
  const data = loadData();
  const colors = ["#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981", "#ec4899", "#6366f1", "#f59e0b"];
  const customer: Customer = {
    id: generateId(),
    name,
    color: colors[data.customers.length % colors.length],
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

export function deleteCustomer(id: string): void {
  const data = loadData();
  data.customers = data.customers.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.customerId !== id);
  saveData(data);
}

export function addTask(customerId: string, title: string, opts?: { description?: string; priority?: Priority; dueDate?: string | null }): Task {
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
  };
  data.tasks.push(task);
  saveData(data);
  return task;
}

export function updateTask(id: string, patch: Partial<Pick<Task, "title" | "description" | "priority" | "status" | "dueDate" | "order">>): void {
  const data = loadData();
  const t = data.tasks.find((t) => t.id === id);
  if (t) {
    if (patch.title !== undefined) t.title = patch.title;
    if (patch.description !== undefined) t.description = patch.description;
    if (patch.priority !== undefined) t.priority = patch.priority;
    if (patch.dueDate !== undefined) t.dueDate = patch.dueDate;
    if (patch.order !== undefined) t.order = patch.order;
    if (patch.status !== undefined) {
      t.status = patch.status;
      t.completedAt = patch.status === "done" ? new Date().toISOString() : null;
    }
    saveData(data);
  }
}

export function deleteTask(id: string): void {
  const data = loadData();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  saveData(data);
}

