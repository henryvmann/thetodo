"use client";

import { useState, useEffect, useRef } from "react";
import type { Customer, Task, Priority, Status } from "@/lib/types";
import * as store from "@/lib/store";

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

const MSD_URL = "https://msd-command.vercel.app";

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
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("P2");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const addCustomerRef = useRef<HTMLInputElement>(null);
  const addTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = store.getAll();
    setCustomers(data.customers);
    setTasks(data.tasks);
  }, []);

  const refresh = () => {
    const data = store.getAll();
    setCustomers(data.customers);
    setTasks(data.tasks);
  };

  const handleImportMSD = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const result = await store.importFromMSD(MSD_URL);
      setImportMsg(`Imported ${result.added} new, updated ${result.updated} existing`);
      refresh();
    } catch (e) {
      setImportMsg(`Import failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setImporting(false);
    setTimeout(() => setImportMsg(null), 5000);
  };

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) return;
    store.addCustomer(newCustomerName.trim());
    setNewCustomerName("");
    setShowAddCustomer(false);
    refresh();
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
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority)
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
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
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Tasks</p>
          <p className="text-2xl font-bold mt-1">{allCounts.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{allCounts.done}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{tasks.filter((t) => t.status === "in-progress").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${allCounts.overdue > 0 ? "text-red-600" : "text-gray-300"}`}>{allCounts.overdue}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — customers */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Customers</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleImportMSD}
                  disabled={importing}
                  className="text-[10px] font-medium px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Sync customers from MSD Command"
                >
                  {importing ? "..." : "Sync MSD"}
                </button>
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center hover:bg-orange-600 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            {importMsg && (
              <div className={`px-3 py-1.5 text-xs border-b ${importMsg.includes("failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {importMsg}
              </div>
            )}

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

              {customers.map((c) => {
                const counts = taskCounts(c.id);
                const m = c.meta;
                return (
                  <div
                    key={c.id}
                    className={`group cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCustomer === c.id ? "bg-orange-50 border-l-4 font-medium" : "border-l-4 border-l-transparent"
                    }`}
                    style={selectedCustomer === c.id ? { borderLeftColor: c.color } : undefined}
                    onClick={() => setSelectedCustomer(c.id)}
                  >
                    <div className="flex items-center justify-between px-4 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{counts.done}/{counts.total}</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
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
                onChange={(e) => setFilterStatus(e.target.value as Status | "all")}
                className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
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
              <span className="text-xs text-gray-400 ml-2">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
            </div>
            {selectedCustomer && (
              <button
                onClick={() => setShowAddTask(true)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                + New Task
              </button>
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
                placeholder="Task title..."
                className="w-full text-sm font-medium border-0 focus:outline-none placeholder:text-gray-400"
              />
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
                  className={`task-card bg-white rounded-xl border border-gray-200 border-l-4 ${pCfg.border} ${t.status === "done" ? "opacity-60" : ""}`}
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
                        {t.dueDate && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            overdue ? "bg-red-100 text-red-600" : dueSoon ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {overdue ? "Overdue: " : ""}{formatDate(t.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
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
      </div>

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
              <textarea
                value={editingTask.description}
                onChange={(e) => { setEditingTask({ ...editingTask, description: e.target.value }); handleUpdateTask(editingTask.id, { description: e.target.value }); }}
                placeholder="Add a description..."
                rows={3}
                className="w-full mt-3 text-sm text-gray-600 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
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
    </div>
  );
}
