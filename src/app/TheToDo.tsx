"use client";

import { useState, useEffect, useRef } from "react";
import type { Customer, Task, Priority, Status, TaskSource, TimeTag } from "@/lib/types";
import * as store from "@/lib/store";
import { seedIfEmpty } from "@/lib/seed-tasks";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; border: string; bg: string }> = {
  P1: { label: "P1 — Critical", color: "text-red-600", border: "border-l-red-500", bg: "bg-red-50" },
  P2: { label: "P2 — Normal", color: "text-orange-600", border: "border-l-orange-500", bg: "bg-orange-50" },
  P3: { label: "P3 — Low", color: "text-gray-500", border: "border-l-gray-400", bg: "bg-gray-50" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  todo: { label: "To Do", color: "text-gray-600", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50" },
  done: { label: "Done", color: "text-green-600", bg: "bg-green-50" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const HEALTH_COLORS: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate + "T23:59:59") < new Date();
}

const ACTION_VERBS = new Set([
  "add", "adjust", "analyze", "apply", "assign", "audit", "build", "cancel", "check", "clean",
  "close", "complete", "configure", "confirm", "connect", "contact", "create", "debug", "define",
  "delete", "deliver", "deploy", "design", "document", "download", "draft", "edit", "email",
  "enable", "escalate", "estimate", "evaluate", "export", "extract", "file", "finalize", "find",
  "fix", "flag", "follow", "generate", "get", "identify", "implement", "import", "inspect",
  "install", "investigate", "launch", "list", "log", "map", "merge", "message", "migrate",
  "monitor", "move", "notify", "onboard", "open", "optimize", "order", "organize", "outline",
  "package", "pause", "pin", "plan", "post", "prepare", "present", "prioritize", "process",
  "produce", "pull", "purchase", "push", "qa", "reach", "read", "reassign", "record", "refactor",
  "remove", "rename", "replace", "reply", "report", "request", "research", "resolve", "respond",
  "restart", "restructure", "review", "revise", "rewrite", "run", "save", "schedule", "scope",
  "send", "set", "share", "ship", "sign", "simplify", "sketch", "source", "start", "stop",
  "submit", "summarize", "swap", "sync", "tag", "test", "track", "transfer", "troubleshoot",
  "turn", "unblock", "update", "upgrade", "upload", "validate", "verify", "write",
]);

function startsWithVerb(text: string): boolean {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase();
  return ACTION_VERBS.has(first || "");
}

function isDueSoon(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate + "T23:59:59");
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

export default function TheToDo() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"customers" | "focus">("customers");
  const [filterStatus, setFilterStatus] = useState<Status | "all" | "overdue">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterSource, setFilterSource] = useState<TaskSource | "all">("all");
  const [filterTimeTag, setFilterTimeTag] = useState<TimeTag | "all">("all");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("P2");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [showSyncAll, setShowSyncAll] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<{ customer: string; tasks: { title: string; priority: string; description: string; dueDate: string | null; selected: boolean }[]; error?: string }[]>([]);
  const [showDropNotes, setShowDropNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<{ title: string; priority: Priority; description?: string; dueDate?: string | null; selected: boolean }[]>([]);
  const [parsedSource, setParsedSource] = useState<"agency" | "manual">("manual");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragCustomerId, setDragCustomerId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);
  const addCustomerRef = useRef<HTMLInputElement>(null);
  const addTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedIfEmpty();
    const data = store.getAll();
    setCustomers(data.customers);
    setTasks(data.tasks);
  }, []);

  const refresh = () => {
    const data = store.getAll();
    setCustomers(data.customers);
    setTasks(data.tasks);
  };

  const handleSyncAll = async () => {
    setSyncLoading(true);
    setSyncResults([]);
    try {
      const resp = await fetch("/api/agency-bulk");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Sync failed");
      setSyncResults((data.results || []).map((r: { customer: string; tasks: { title: string; priority: string; description: string; dueDate: string | null }[]; error?: string }) => ({
        ...r,
        tasks: r.tasks.map((t) => ({ ...t, selected: true })),
      })));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Unknown error");
    }
    setSyncLoading(false);
  };

  const handleAddSyncedTasks = () => {
    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existingTitles = new Set(tasks.map((t) => normalize(t.title)));
    let added = 0;
    let skipped = 0;
    for (const r of syncResults) {
      const customer = customers.find((c) => normalize(c.name) === normalize(r.customer));
      if (!customer) continue;
      const selected = r.tasks.filter((t) => t.selected);
      for (const t of selected) {
        if (existingTitles.has(normalize(t.title))) { skipped++; continue; }
        store.addTask(customer.id, t.title, {
          priority: t.priority as Priority,
          description: t.description,
          dueDate: t.dueDate || null,
          source: "agency",
        });
        existingTitles.add(normalize(t.title));
        added++;
      }
    }
    refresh();
    setShowSyncAll(false);
    setSyncResults([]);
  };

  const handlePullAgency = async () => {
    if (!selectedCustomer) return;
    setParsing(true);
    setParseError(null);
    setParsedTasks([]);
    setParsedSource("agency");
    const customerName = customers.find((c) => c.id === selectedCustomer)?.name || "";
    try {
      const resp = await fetch("/api/agency-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Agency pull failed");
      setParsedTasks((data.tasks || []).map((t: { title: string; priority?: string; description?: string; dueDate?: string | null }) => ({
        ...t,
        priority: (t.priority as Priority) || "P2",
        selected: true,
      })));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Unknown error");
    }
    setParsing(false);
  };

  const handleParseNotes = async () => {
    if (!notesText.trim()) return;
    setParsing(true);
    setParseError(null);
    setParsedTasks([]);
    setParsedSource("manual");
    const customerName = selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name : "Unknown";
    try {
      const resp = await fetch("/api/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText, customerName }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Parse failed");
      setParsedTasks((data.tasks || []).map((t: { title: string; priority?: string; description?: string; dueDate?: string | null }) => ({
        ...t,
        priority: (t.priority as Priority) || "P2",
        selected: true,
      })));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Unknown error");
    }
    setParsing(false);
  };

  const handleAddParsedTasks = () => {
    if (!selectedCustomer) return;
    const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existingTitles = new Set(tasks.map((t) => normalize(t.title)));
    const toAdd = parsedTasks.filter((t) => t.selected);
    for (const t of toAdd) {
      if (existingTitles.has(normalize(t.title))) continue;
      store.addTask(selectedCustomer, t.title, {
        priority: t.priority,
        description: t.description,
        dueDate: t.dueDate || null,
        source: parsedSource,
      });
      existingTitles.add(normalize(t.title));
    }
    refresh();
    setShowDropNotes(false);
    setNotesText("");
    setParsedTasks([]);
  };

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) return;
    store.addCustomer(newCustomerName.trim());
    setNewCustomerName("");
    setShowAddCustomer(false);
    refresh();
  };

  const handleMoveCustomer = (id: string, direction: "up" | "down") => {
    const idx = customers.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= customers.length) return;
    const reordered = [...customers];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    store.reorderCustomers(reordered.map((c) => c.id));
    setCustomers(reordered);
  };

  const handleDragDrop = (targetId: string) => {
    if (!dragCustomerId || dragCustomerId === targetId) return;
    const fromIdx = customers.findIndex((c) => c.id === dragCustomerId);
    const toIdx = customers.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...customers];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    store.reorderCustomers(reordered.map((c) => c.id));
    setCustomers(reordered);
    setDragCustomerId(null);
    setDragOverId(null);
  };

  const handleDeleteCustomer = (id: string) => {
    const c = customers.find((c) => c.id === id);
    if (!confirm(`Delete "${c?.name}" and all its tasks?`)) return;
    store.deleteCustomer(id);
    if (selectedCustomer === id) setSelectedCustomer(null);
    refresh();
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedCustomer) return;
    store.addTask(selectedCustomer, newTaskTitle.trim(), {
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      dueDate: newTaskDue || null,
    });
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskPriority("P2");
    setNewTaskDue("");
    setShowAddTask(false);
    refresh();
  };

  const handleUpdateTask = (id: string, patch: Parameters<typeof store.updateTask>[1]) => {
    store.updateTask(id, patch);
    refresh();
    if (editingTask?.id === id) {
      setEditingTask({ ...editingTask, ...patch } as Task);
    }
  };

  const handleDeleteTask = (id: string) => {
    store.deleteTask(id);
    setEditingTask(null);
    refresh();
  };

  const cycleStatus = (task: Task) => {
    const order: Status[] = ["todo", "in-progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    handleUpdateTask(task.id, { status: next });
  };

  // Filtered tasks
  const filteredTasks = tasks
    .filter((t) => !selectedCustomer || t.customerId === selectedCustomer)
    .filter((t) => filterStatus === "all" ? true : filterStatus === "overdue" ? isOverdue(t) : t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority)
    .filter((t) => filterSource === "all" || (t.source || "seed") === filterSource)
    .filter((t) => filterTimeTag === "all" || (t.timeTag || null) === filterTimeTag)
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      const tOrd = (t: TimeTag | undefined) => t === "today" ? 0 : t === "this-week" ? 1 : t === "soon" ? 2 : 3;
      if (tOrd(a.timeTag) !== tOrd(b.timeTag)) return tOrd(a.timeTag) - tOrd(b.timeTag);
      const pOrd = { P1: 0, P2: 1, P3: 2 };
      if (pOrd[a.priority] !== pOrd[b.priority]) return pOrd[a.priority] - pOrd[b.priority];
      return a.order - b.order;
    });

  const taskCounts = (customerId: string | null) => {
    const ct = customerId ? tasks.filter((t) => t.customerId === customerId) : tasks;
    return {
      total: ct.length,
      done: ct.filter((t) => t.status === "done").length,
      overdue: ct.filter((t) => isOverdue(t)).length,
    };
  };

  const allCounts = taskCounts(null);

  useEffect(() => {
    if (showAddCustomer) addCustomerRef.current?.focus();
  }, [showAddCustomer]);
  useEffect(() => {
    if (showAddTask) addTaskRef.current?.focus();
  }, [showAddTask]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-lg border border-silver-200 p-0.5">
          <button
            onClick={() => setViewMode("customers")}
            className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${viewMode === "customers" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            By Customer
          </button>
          <button
            onClick={() => setViewMode("focus")}
            className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${viewMode === "focus" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            Focus Board
          </button>
        </div>
        <button
          onClick={() => { setShowSyncAll(true); handleSyncAll(); }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          Sync All from Agency
        </button>
      </div>

      {/* Header stats — clickable to filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setFilterStatus(filterStatus === "all" ? "all" : "all"); setFilterPriority("all"); setFilterSource("all"); setFilterTimeTag("all"); setViewMode("customers"); setSelectedCustomer(null); }}
          className={`text-left bg-white/80 backdrop-blur rounded-xl border p-4 shadow-sm transition-colors cursor-pointer ${filterStatus === "all" && filterPriority === "all" ? "border-gray-900 ring-2 ring-gray-900/10" : "border-silver-200 hover:border-gray-400"}`}
        >
          <p className="text-xs text-gray-500 font-medium">Total Tasks</p>
          <p className="text-2xl font-bold mt-1">{allCounts.total}</p>
        </button>
        <button
          onClick={() => { setFilterStatus(filterStatus === "done" ? "all" : "done"); setViewMode("customers"); setSelectedCustomer(null); }}
          className={`text-left bg-white/80 backdrop-blur rounded-xl border p-4 shadow-sm transition-colors cursor-pointer ${filterStatus === "done" ? "border-green-500 ring-2 ring-green-500/20" : "border-silver-200 hover:border-green-300"}`}
        >
          <p className="text-xs text-gray-500 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{allCounts.done}</p>
        </button>
        <button
          onClick={() => { setFilterStatus(filterStatus === "in-progress" ? "all" : "in-progress"); setViewMode("customers"); setSelectedCustomer(null); }}
          className={`text-left bg-white/80 backdrop-blur rounded-xl border p-4 shadow-sm transition-colors cursor-pointer ${filterStatus === "in-progress" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-silver-200 hover:border-blue-300"}`}
        >
          <p className="text-xs text-gray-500 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{tasks.filter((t) => t.status === "in-progress").length}</p>
        </button>
        <button
          onClick={() => { setFilterStatus(filterStatus === "overdue" ? "all" : "overdue"); setViewMode("customers"); setSelectedCustomer(null); }}
          className={`text-left bg-white/80 backdrop-blur rounded-xl border p-4 shadow-sm transition-colors cursor-pointer ${filterStatus === "overdue" ? "border-red-500 ring-2 ring-red-500/20" : "border-silver-200 hover:border-red-300"}`}
        >
          <p className="text-xs text-gray-500 font-medium">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${allCounts.overdue > 0 ? "text-red-600" : "text-gray-300"}`}>{allCounts.overdue}</p>
        </button>
      </div>

      {/* Focus Board view */}
      {viewMode === "focus" && (() => {
        const openTasks = tasks.filter((t) => t.status !== "done");
        const allLanes: { tag: TimeTag; label: string; color: string; dropColor: string; tasks: Task[] }[] = [
          { tag: "today", label: "Today", color: "border-orange-500 bg-orange-50/50", dropColor: "ring-orange-500 bg-orange-100/60", tasks: openTasks.filter((t) => t.timeTag === "today") },
          { tag: "this-week", label: "This Week", color: "border-orange-300 bg-orange-50/30", dropColor: "ring-orange-400 bg-orange-50/60", tasks: openTasks.filter((t) => t.timeTag === "this-week") },
          { tag: "soon", label: "Soon", color: "border-gray-300 bg-gray-50", dropColor: "ring-gray-400 bg-gray-100/60", tasks: openTasks.filter((t) => t.timeTag === "soon") },
          { tag: null, label: "Untagged", color: "border-gray-300 border-dashed bg-transparent", dropColor: "ring-gray-400 bg-gray-50/60", tasks: openTasks.filter((t) => !t.timeTag) },
        ];

        const renderFocusTask = (t: Task, isUntagged = false) => {
          const customer = customers.find((c) => c.id === t.customerId);
          const pCfg = PRIORITY_CONFIG[t.priority];
          return (
            <div
              key={t.id}
              draggable
              onDragStart={() => setDragTaskId(t.id)}
              onDragEnd={() => { setDragTaskId(null); setDragOverLane(null); }}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-grab active:cursor-grabbing transition-all ${
                dragTaskId === t.id ? "opacity-40 scale-95" : ""
              } ${isUntagged ? "bg-white/60 border-gray-200" : "bg-white/80 backdrop-blur border-silver-200 shadow-sm"}`}
            >
              <button
                onClick={() => cycleStatus(t)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  t.status === "in-progress" ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-orange-400"
                }`}
              >
                {t.status === "in-progress" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${isUntagged ? "text-gray-500" : "text-gray-900"}`}>{t.title}</span>
              </div>
              {customer && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: customer.color }}>
                  {customer.name}
                </span>
              )}
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${pCfg.bg} ${pCfg.color} shrink-0`}>{t.priority}</span>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {allLanes.map((g) => (
              <div
                key={g.tag || "untagged"}
                onDragOver={(e) => { e.preventDefault(); setDragOverLane(g.tag as string || "untagged"); }}
                onDragLeave={() => setDragOverLane(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragTaskId) {
                    handleUpdateTask(dragTaskId, { timeTag: g.tag });
                    setDragTaskId(null);
                    setDragOverLane(null);
                  }
                }}
                className={`rounded-xl border-l-4 p-4 transition-all ${
                  dragOverLane === (g.tag || "untagged") && dragTaskId ? `ring-2 ${g.dropColor}` : g.color
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${g.tag ? "text-gray-900" : "text-gray-400"}`}>{g.label}</h3>
                  <span className="text-xs text-gray-400">{g.tasks.length} task{g.tasks.length !== 1 ? "s" : ""}</span>
                </div>
                {g.tasks.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    {dragTaskId ? "Drop here" : `No tasks tagged ${g.label.toLowerCase()}`}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {g.tasks
                      .sort((a, b) => {
                        const pOrd = { P1: 0, P2: 1, P3: 2 };
                        return pOrd[a.priority] - pOrd[b.priority];
                      })
                      .map((t) => renderFocusTask(t, !g.tag))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Customer view */}
      {viewMode === "customers" && <div className="flex gap-6">
        {/* Sidebar — customers */}
        <div className="w-64 shrink-0">
          <div className="bg-white/80 backdrop-blur rounded-xl border border-silver-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Customers</h2>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center hover:bg-orange-600 transition-colors"
              >
                +
              </button>
            </div>

            {showAddCustomer && (
              <div className="px-3 py-2 border-b bg-orange-50">
                <input
                  ref={addCustomerRef}
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomer();
                    if (e.key === "Escape") { setShowAddCustomer(false); setNewCustomerName(""); }
                  }}
                  placeholder="Customer name..."
                  className="w-full px-2 py-1.5 text-sm border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex justify-end gap-1 mt-1.5">
                  <button onClick={() => { setShowAddCustomer(false); setNewCustomerName(""); }} className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700">Cancel</button>
                  <button onClick={handleAddCustomer} className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600">Add</button>
                </div>
              </div>
            )}

            <div className="max-h-[500px] overflow-y-auto">
              {/* All customers view */}
              <button
                onClick={() => setSelectedCustomer(null)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  selectedCustomer === null ? "bg-orange-50 border-l-4 border-l-orange-500 font-medium" : "border-l-4 border-l-transparent"
                }`}
              >
                <span>All Customers</span>
                <span className="text-xs text-gray-400">{tasks.length}</span>
              </button>

              {customers.map((c, ci) => {
                const counts = taskCounts(c.id);
                const m = c.meta;
                const isDragOver = dragOverId === c.id && dragCustomerId !== c.id;
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragCustomerId(c.id)}
                    onDragEnd={() => { setDragCustomerId(null); setDragOverId(null); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(c.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => { e.preventDefault(); handleDragDrop(c.id); }}
                    className={`group cursor-pointer transition-colors ${
                      isDragOver ? "border-t-2 border-t-orange-500" : ""
                    } ${dragCustomerId === c.id ? "opacity-40" : ""} ${
                      selectedCustomer === c.id ? "bg-orange-50 border-l-4 font-medium" : "border-l-4 border-l-transparent"
                    } hover:bg-gray-50`}
                    style={selectedCustomer === c.id ? { borderLeftColor: c.color } : undefined}
                    onClick={() => setSelectedCustomer(c.id)}
                  >
                    <div className="flex items-center justify-between px-4 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Drag handle */}
                        <span className="text-gray-300 cursor-grab active:cursor-grabbing text-xs opacity-0 group-hover:opacity-100 select-none" title="Drag to reorder">⠿</span>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 mr-1">{counts.done}/{counts.total}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveCustomer(c.id, "up"); }}
                          disabled={ci === 0}
                          className="text-gray-300 hover:text-orange-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                          title="Move up"
                        >▲</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveCustomer(c.id, "down"); }}
                          disabled={ci === customers.length - 1}
                          className="text-gray-300 hover:text-orange-500 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                          title="Move down"
                        >▼</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id); }}
                          className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {m && (
                      <div className="flex items-center gap-1.5 px-4 pb-2 flex-wrap">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${HEALTH_COLORS[m.healthColor] || "bg-gray-100 text-gray-600"}`}>
                          {m.healthScore}
                        </span>
                        {m.totalStartingRevenue > 0 && (
                          <span className="text-[9px] text-gray-500 font-medium">{formatCurrency(m.totalStartingRevenue)}</span>
                        )}
                        {m.stage && (
                          <span className="text-[9px] text-gray-400 truncate max-w-[80px]">{m.stage}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {customers.length === 0 && !showAddCustomer && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No customers yet.<br />Click + to add one.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main — tasks */}
        <div className="flex-1 min-w-0">
          {/* Customer detail card */}
          {(() => {
            const c = selectedCustomer ? customers.find((c) => c.id === selectedCustomer) : null;
            const m = c?.meta;
            if (!c || !m) return null;
            return (
              <div className="bg-white/80 backdrop-blur rounded-xl border border-silver-200 p-4 shadow-sm mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{c.name}</h2>
                    {m.owner && <p className="text-xs text-gray-500 mt-0.5">Owner: {m.owner}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded ${HEALTH_COLORS[m.healthColor] || "bg-gray-100 text-gray-600"}`}>
                    {m.healthScore} — {m.healthLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Starting ARR</p>
                    <p className="text-sm font-semibold">{formatCurrency(m.saasStartingARR)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Total Revenue</p>
                    <p className="text-sm font-semibold">{formatCurrency(m.totalStartingRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Stage</p>
                    <p className="text-sm font-semibold">{m.stage || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Quarter</p>
                    <p className="text-sm font-semibold">{m.quarter || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Product</p>
                    <p className="text-sm font-semibold">{m.productType || "—"}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as Status | "all" | "overdue")}
                className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
                className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Priorities</option>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — Normal</option>
                <option value="P3">P3 — Low</option>
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as TaskSource | "all")}
                className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="agency">Agency</option>
                <option value="seed">Seed</option>
              </select>
              <div className="flex items-center gap-1 ml-1">
                {(["all", "today", "this-week", "soon"] as const).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTimeTag(tag)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      filterTimeTag === tag
                        ? tag === "today" ? "bg-orange-500 text-white" : tag === "this-week" ? "bg-orange-200 text-orange-800" : tag === "soon" ? "bg-gray-300 text-gray-700" : "bg-gray-200 text-gray-700"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {tag === "all" ? "All" : tag === "today" ? "Today" : tag === "this-week" ? "This Week" : "Soon"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 ml-2">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
            </div>
            {selectedCustomer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDropNotes(true)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                >
                  Drop Notes
                </button>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  + New Task
                </button>
              </div>
            )}
          </div>

          {/* Add task inline form */}
          {showAddTask && selectedCustomer && (
            <div className="bg-white rounded-xl border-2 border-orange-300 p-4 mb-4">
              <input
                ref={addTaskRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleAddTask(); if (e.key === "Escape") setShowAddTask(false); }}
                placeholder="Start with a verb: Review, Build, Send, Schedule..."
                className="w-full text-sm font-medium border-0 focus:outline-none placeholder:text-gray-400"
              />
              {newTaskTitle.length > 2 && !startsWithVerb(newTaskTitle) && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Tip: start with an action verb (Review, Build, Send, Schedule...) so you know exactly what to do
                </p>
              )}
              <textarea
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full mt-2 text-sm text-gray-600 border-0 focus:outline-none placeholder:text-gray-300 resize-none"
              />
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — Normal</option>
                  <option value="P3">P3 — Low</option>
                </select>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                />
                <div className="flex-1" />
                <button onClick={() => { setShowAddTask(false); setNewTaskTitle(""); setNewTaskDesc(""); }} className="text-xs text-gray-500 px-3 py-1 hover:text-gray-700">Cancel</button>
                <button onClick={handleAddTask} className="text-xs bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 font-medium">Add Task</button>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="space-y-2">
            {filteredTasks.map((t) => {
              const pCfg = PRIORITY_CONFIG[t.priority];
              const sCfg = STATUS_CONFIG[t.status];
              const customer = customers.find((c) => c.id === t.customerId);
              const overdue = isOverdue(t);
              const dueSoon = isDueSoon(t);

              return (
                <div
                  key={t.id}
                  className={`task-card bg-white/80 backdrop-blur rounded-xl border border-silver-200 border-l-4 shadow-sm ${pCfg.border} ${t.status === "done" ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3 px-4 py-3">
                    {/* Status toggle */}
                    <button
                      onClick={() => cycleStatus(t)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        t.status === "done"
                          ? "bg-green-500 border-green-500 text-white"
                          : t.status === "in-progress"
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 hover:border-orange-400"
                      }`}
                    >
                      {t.status === "done" && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {t.status === "in-progress" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${t.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {t.title}
                        </span>
                        {!selectedCustomer && customer && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: customer.color }}
                          >
                            {customer.name}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${pCfg.bg} ${pCfg.color}`}>{t.priority}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sCfg.bg} ${sCfg.color}`}>{sCfg.label}</span>
                        {(t.source === "agency") && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">Agency</span>
                        )}
                        {(t.source === "seed") && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">Seed</span>
                        )}
                        {t.dueDate && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            overdue ? "bg-red-100 text-red-600" : dueSoon ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {overdue ? "Overdue: " : ""}{formatDate(t.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time tag + Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {([["today", "Today", "bg-orange-500 text-white", "hover:bg-orange-100 hover:text-orange-600"],
                         ["this-week", "Week", "bg-orange-200 text-orange-800", "hover:bg-orange-50 hover:text-orange-600"],
                         ["soon", "Soon", "bg-gray-300 text-gray-700", "hover:bg-gray-200 hover:text-gray-600"]] as const).map(([tag, label, active, hover]) => (
                        <button
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); handleUpdateTask(t.id, { timeTag: t.timeTag === tag ? null : tag }); }}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                            t.timeTag === tag ? active : `bg-gray-100 text-gray-400 ${hover}`
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditingTask(t)}
                        className="text-gray-300 hover:text-orange-500 p-1 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                {!selectedCustomer ? (
                  <div>
                    <p className="text-lg font-medium text-gray-500">Welcome to TheToDo</p>
                    <p className="text-sm mt-1">Select a customer or add one to get started.</p>
                  </div>
                ) : tasks.filter((t) => t.customerId === selectedCustomer).length === 0 ? (
                  <div>
                    <p className="text-sm">No tasks yet. Click <span className="font-medium text-orange-500">+ New Task</span> to add one.</p>
                  </div>
                ) : (
                  <p className="text-sm">No tasks match these filters.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Edit task modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingTask(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="stripe-bar rounded-t-2xl" />
            <div className="p-6">
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => { setEditingTask({ ...editingTask, title: e.target.value }); handleUpdateTask(editingTask.id, { title: e.target.value }); }}
                className="w-full text-lg font-semibold border-0 focus:outline-none"
              />
              {editingTask.title.length > 2 && !startsWithVerb(editingTask.title) && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Tip: start with an action verb (Review, Build, Send, Schedule...)
                </p>
              )}
              <textarea
                value={editingTask.description}
                onChange={(e) => { setEditingTask({ ...editingTask, description: e.target.value }); handleUpdateTask(editingTask.id, { description: e.target.value }); }}
                placeholder="Add a description..."
                rows={3}
                className="w-full mt-3 text-sm text-gray-600 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <div className="flex items-center gap-2 mt-4">
                <label className="text-xs text-gray-500 font-medium">Focus:</label>
                {([null, "today", "this-week", "soon"] as const).map((tag) => (
                  <button
                    key={tag || "none"}
                    onClick={() => { setEditingTask({ ...editingTask, timeTag: tag }); handleUpdateTask(editingTask.id, { timeTag: tag }); }}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                      editingTask.timeTag === tag
                        ? tag === "today" ? "bg-orange-500 text-white" : tag === "this-week" ? "bg-orange-200 text-orange-800" : tag === "soon" ? "bg-gray-300 text-gray-700" : "bg-gray-200 text-gray-700"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {tag === null ? "None" : tag === "today" ? "Today" : tag === "this-week" ? "This Week" : "Soon"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => { const v = e.target.value as Priority; setEditingTask({ ...editingTask, priority: v }); handleUpdateTask(editingTask.id, { priority: v }); }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="P1">P1 — Critical</option>
                    <option value="P2">P2 — Normal</option>
                    <option value="P3">P3 — Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => { const v = e.target.value as Status; setEditingTask({ ...editingTask, status: v }); handleUpdateTask(editingTask.id, { status: v }); }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ""}
                    onChange={(e) => { const v = e.target.value || null; setEditingTask({ ...editingTask, dueDate: v }); handleUpdateTask(editingTask.id, { dueDate: v }); }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { handleDeleteTask(editingTask.id); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete task
                </button>
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync All modal */}
      {showSyncAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="stripe-bar rounded-t-2xl" />
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Sync All from Agency</h2>
                {syncLoading ? (
                  <p className="text-xs text-gray-500">Pulling overviews from all accounts...</p>
                ) : syncResults.length > 0 ? (
                  <p className="text-xs text-gray-500">
                    {syncResults.filter((r) => r.tasks.length > 0).length} accounts with tasks &middot;{" "}
                    {syncResults.reduce((s, r) => s + r.tasks.filter((t) => t.selected).length, 0)} tasks selected
                  </p>
                ) : null}
              </div>
              <button onClick={() => { setShowSyncAll(false); setSyncResults([]); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {syncLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-3">Fetching Agency overviews...</p>
                  </div>
                </div>
              )}

              {!syncLoading && syncResults.length > 0 && (() => {
                const normTitle = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
                const existingSet = new Set(tasks.map((t) => normTitle(t.title)));
                return (
                <div className="space-y-4">
                  {syncResults
                    .filter((r) => r.tasks.length > 0)
                    .sort((a, b) => b.tasks.length - a.tasks.length)
                    .map((r) => {
                      const customer = customers.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === r.customer.toLowerCase().replace(/[^a-z0-9]/g, ""));
                      const allSelected = r.tasks.every((t) => t.selected);
                      return (
                        <div key={r.customer} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => {
                                  const newVal = !allSelected;
                                  setSyncResults((prev) => prev.map((p) =>
                                    p.customer === r.customer ? { ...p, tasks: p.tasks.map((t) => ({ ...t, selected: newVal })) } : p
                                  ));
                                }}
                                className="accent-orange-500"
                              />
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customer?.color || "#666" }} />
                              <span className="text-sm font-semibold">{r.customer}</span>
                            </div>
                            <span className="text-xs text-gray-400">{r.tasks.filter((t) => t.selected).length}/{r.tasks.length} tasks</span>
                          </div>
                          <div className="divide-y">
                            {r.tasks.map((t, ti) => (
                              <div key={ti} className={`flex items-start gap-3 px-4 py-2 ${existingSet.has(normTitle(t.title)) ? "opacity-30 line-through" : t.selected ? "" : "opacity-40"}`}>
                                <input
                                  type="checkbox"
                                  checked={t.selected}
                                  onChange={() => {
                                    setSyncResults((prev) => prev.map((p) =>
                                      p.customer === r.customer ? { ...p, tasks: p.tasks.map((tt, tti) => tti === ti ? { ...tt, selected: !tt.selected } : tt) } : p
                                    ));
                                  }}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-gray-900">{t.title}</span>
                                  {existingSet.has(normTitle(t.title)) && (
                                    <span className="text-[10px] font-medium text-gray-400 ml-2">already exists</span>
                                  )}
                                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {t.dueDate && <span className="text-[10px] text-gray-400">{t.dueDate}</span>}
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    t.priority === "P1" ? "bg-red-50 text-red-600" : t.priority === "P3" ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600"
                                  }`}>{t.priority}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {syncResults.filter((r) => r.tasks.length === 0 && !r.error).length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      No tasks extracted for: {syncResults.filter((r) => r.tasks.length === 0).map((r) => r.customer).join(", ")}
                    </div>
                  )}
                </div>
              );
              })()}
            </div>

            {!syncLoading && syncResults.length > 0 && (
              <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={() => { setShowSyncAll(false); setSyncResults([]); }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button
                  onClick={handleAddSyncedTasks}
                  disabled={syncResults.reduce((s, r) => s + r.tasks.filter((t) => t.selected).length, 0) === 0}
                  className="px-6 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  Add {syncResults.reduce((s, r) => s + r.tasks.filter((t) => t.selected).length, 0)} Tasks
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drop Notes modal */}
      {showDropNotes && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowDropNotes(false); setParsedTasks([]); setNotesText(""); setParseError(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="stripe-bar rounded-t-2xl" />
            <div className="p-6 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Drop Notes</h2>
                  <p className="text-xs text-gray-500">Paste your call notes — AI will extract actionable tasks</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded text-white" style={{ backgroundColor: customers.find((c) => c.id === selectedCustomer)?.color || "#666" }}>
                  {customers.find((c) => c.id === selectedCustomer)?.name}
                </span>
              </div>

              {parsedTasks.length === 0 ? (
                <>
                  {/* Agency pull — one click, auto-fills from call notes */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                    <button
                      onClick={handlePullAgency}
                      disabled={parsing}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {parsing ? "Pulling from Agency..." : "Pull from Agency"}
                    </button>
                    <span className="text-xs text-gray-400">Auto-extract tasks from latest Agency call notes & overview</span>
                  </div>

                  <p className="text-[10px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Or paste notes manually</p>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleParseNotes(); }}
                    placeholder="Paste your call notes, meeting transcript, or any text with action items...&#10;&#10;Press Cmd+Enter to extract tasks"
                    rows={8}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none flex-1"
                  />
                  {parseError && <p className="text-xs text-red-600 mt-2">{parseError}</p>}
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => { setShowDropNotes(false); setNotesText(""); setParseError(null); }} className="text-sm text-gray-500 px-4 py-1.5 hover:text-gray-700">Cancel</button>
                    <button
                      onClick={handleParseNotes}
                      disabled={parsing || !notesText.trim()}
                      className="px-5 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {parsing ? "Parsing..." : "Extract Tasks"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">
                    {parsedTasks.filter((t) => t.selected).length} of {parsedTasks.length} tasks selected — uncheck any you don&apos;t want
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                    {parsedTasks.map((t, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${t.selected ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-gray-50 opacity-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={t.selected}
                          onChange={() => setParsedTasks((prev) => prev.map((p, j) => j === i ? { ...p, selected: !p.selected } : p))}
                          className="mt-1 accent-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{t.title}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              t.priority === "P1" ? "bg-red-50 text-red-600" : t.priority === "P3" ? "bg-gray-100 text-gray-500" : "bg-orange-50 text-orange-600"
                            }`}>{t.priority}</span>
                            {t.dueDate && <span className="text-[10px] text-gray-400">{t.dueDate}</span>}
                          </div>
                          {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                        </div>
                        <select
                          value={t.priority}
                          onChange={(e) => setParsedTasks((prev) => prev.map((p, j) => j === i ? { ...p, priority: e.target.value as Priority } : p))}
                          className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white shrink-0"
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => { setParsedTasks([]); }} className="text-xs text-gray-500 hover:text-gray-700">Back to notes</button>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowDropNotes(false); setParsedTasks([]); setNotesText(""); }} className="text-sm text-gray-500 px-4 py-1.5 hover:text-gray-700">Cancel</button>
                      <button
                        onClick={handleAddParsedTasks}
                        disabled={parsedTasks.filter((t) => t.selected).length === 0}
                        className="px-5 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        Add {parsedTasks.filter((t) => t.selected).length} Tasks
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
