"use client";

import React, { useState } from "react";
import { useSupportStore } from "@/store/use-support-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useDocStore } from "@/store/use-doc-store";
import {
  LifeBuoy,
  X,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Tag,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Info,
} from "lucide-react";
import { TicketCategory, TicketPriority, TicketStatus, SupportTicket } from "@/types";

export const SupportModal: React.FC = () => {
  const {
    tickets,
    activeTicketId,
    isSupportModalOpen,
    setSupportModalOpen,
    setActiveTicketId,
    createTicket,
    addTicketComment,
    updateTicketStatus,
  } = useSupportStore();

  const { user } = useAuthStore();
  const { currentProject } = useDocStore();

  const [activeTab, setActiveTab] = useState<"form" | "track">("form");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("bug");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.username || "");
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);

  // Thread comment input
  const [newComment, setNewComment] = useState("");

  if (!isSupportModalOpen) return null;

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !email.trim()) return;

    const diagnostics = attachDiagnostics
      ? {
          projectTitle: currentProject.metadata.title,
          designLevel: currentProject.designLevel || "hld",
          browser: typeof navigator !== "undefined" ? navigator.userAgent.split(" ").slice(-2).join(" ") : "Unknown",
          os: typeof navigator !== "undefined" ? navigator.platform : "Windows",
        }
      : undefined;

    const created = createTicket({
      subject: subject.trim(),
      category,
      priority,
      description: description.trim(),
      userEmail: email.trim(),
      userName: name.trim() || user?.username || "Requester",
      diagnostics,
    });

    setTicketSubmitted(created.ticketNumber);
    setSubject("");
    setDescription("");
    setTimeout(() => {
      setTicketSubmitted(null);
      setActiveTab("track");
    }, 1400);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTicket) return;

    addTicketComment(
      activeTicket.id,
      user?.username || activeTicket.userName || "User",
      newComment.trim(),
      false
    );
    setNewComment("");
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">Open</span>;
      case "in_review":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">In Review</span>;
      case "in_progress":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">In Progress</span>;
      case "resolved":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">Resolved</span>;
      case "closed":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Closed</span>;
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "critical":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
            <Flame className="w-3 h-3" /> Critical
          </span>
        );
      case "high":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
            <AlertTriangle className="w-3 h-3" /> High
          </span>
        );
      case "medium":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400">
            <Clock className="w-3 h-3" /> Medium
          </span>
        );
      case "low":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Info className="w-3 h-3" /> Low
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Support Desk & Issue Tracking</span>
                {tickets.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {tickets.length} Tickets
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Submit bug reports, architectural questions, and track resolution in real time
              </p>
            </div>
          </div>
          <button
            onClick={() => setSupportModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center justify-between px-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 py-2.5">
            <button
              onClick={() => {
                setActiveTab("form");
                setActiveTicketId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "form" && !activeTicketId
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit New Ticket</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("track");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "track" || activeTicketId
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track Tickets ({tickets.length})</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: SUBMIT TICKET FORM */}
          {activeTab === "form" && !activeTicketId && (
            <form onSubmit={handleSubmitTicket} className="max-w-xl mx-auto space-y-4">
              {ticketSubmitted && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">Ticket Logged Successfully!</div>
                    <div className="text-[11px] text-emerald-400/90">
                      Tracking reference: <strong>{ticketSubmitted}</strong>. Switching to tracker...
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your name..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="engineer@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Ticket Subject / Summary <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g. Issue with LLD Database ERD export or question on Kafka topology"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="bug">🐛 Bug Report</option>
                    <option value="feature">✨ Feature Request</option>
                    <option value="architecture">🏛️ Architecture Consultation</option>
                    <option value="performance">⚡ Performance Issue</option>
                    <option value="account">🔐 Account & Authentication</option>
                    <option value="other">💬 General Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low (General guidance)</option>
                    <option value="medium">Medium (Standard priority)</option>
                    <option value="high">High (Impacting deliverable)</option>
                    <option value="critical">Critical (Blocking work)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Description & Reproduction Steps <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Provide detailed context, expected vs actual behavior, or specific architecture requirements..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Attach Diagnostics Checkbox */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="diag-check"
                  checked={attachDiagnostics}
                  onChange={(e) => setAttachDiagnostics(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="diag-check" className="cursor-pointer text-[11px] text-slate-300">
                  <span className="font-semibold block text-slate-200">
                    Attach active project telemetry & environment metadata
                  </span>
                  <span className="text-slate-500 block text-[10px]">
                    Includes: Document &quot;{currentProject.metadata.title}&quot; &bull; Level:{" "}
                    {(currentProject.designLevel || "hld").toUpperCase()} &bull; OS/Browser info.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TRACK TICKETS LIST */}
          {(activeTab === "track" && !activeTicketId) && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tickets by ID or title..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
                  {["all", "open", "in_review", "in_progress", "resolved"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 rounded font-bold capitalize transition ${
                        statusFilter === st ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <LifeBuoy className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-semibold text-slate-300">No support tickets found</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Have a question or encountered a bug? Submit a new ticket using the button above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTicketId(t.id)}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold">
                            {t.ticketNumber}
                          </span>
                          {getStatusBadge(t.status)}
                          {getPriorityBadge(t.priority)}
                          <span className="text-[10px] text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition">
                          {t.subject}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <MessageSquare className="w-3 h-3" />
                          <span>{t.comments.length}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVE TICKET THREAD VIEW */}
          {activeTicket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={() => setActiveTicketId(null)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Tickets</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Status:</span>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value as TicketStatus)}
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Ticket Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {activeTicket.ticketNumber}
                    </span>
                    {getStatusBadge(activeTicket.status)}
                    {getPriorityBadge(activeTicket.priority)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Logged: {new Date(activeTicket.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{activeTicket.subject}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-3">
                  {activeTicket.description}
                </p>

                {activeTicket.diagnostics && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                    <span><strong>Project:</strong> {activeTicket.diagnostics.projectTitle}</span>
                    <span><strong>Level:</strong> {activeTicket.diagnostics.designLevel?.toUpperCase()}</span>
                    <span><strong>OS:</strong> {activeTicket.diagnostics.os}</span>
                  </div>
                )}
              </div>

              {/* Comments & Conversation Thread */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Ticket Updates & Discussion ({activeTicket.comments.length})
                </h4>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeTicket.comments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        c.isStaff
                          ? "bg-indigo-950/30 border-indigo-500/30 ml-3"
                          : "bg-slate-950/60 border-slate-800 mr-3"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${c.isStaff ? "text-indigo-400" : "text-slate-300"}`}>
                          {c.author} {c.isStaff && "🛡️ (Support)"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.timestamp}</span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-line">{c.message}</p>
                    </div>
                  ))}
                </div>

                {/* Add Reply */}
                <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a follow-up reply or question..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
