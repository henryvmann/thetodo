export type Priority = "P1" | "P2" | "P3";
export type Status = "todo" | "in-progress" | "done";
export type TaskSource = "manual" | "agency" | "seed";
export type TimeTag = "today" | "this-week" | null;

export interface Task {
  id: string;
  customerId: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string | null; // ISO date or null
  createdAt: string;
  completedAt: string | null;
  order: number;
  source: TaskSource;
  timeTag: TimeTag;
}

export interface CustomerMeta {
  owner: string | null;
  stage: string | null;
  quarter: string | null;
  saasStartingARR: number;
  totalStartingRevenue: number;
  contractStartDate: string | null;
  productType: string | null;
  healthScore: number;
  healthLabel: string;
  healthColor: string;
}

export interface Customer {
  id: string;
  name: string;
  color: string; // hex accent color
  createdAt: string;
  meta?: CustomerMeta;
}

export interface AppData {
  customers: Customer[];
  tasks: Task[];
}
