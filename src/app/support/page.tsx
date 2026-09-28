"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSupportStore } from "@/store/use-support-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useDocStore } from "@/store/use-doc-store";
import {
  LifeBuoy,
  ArrowLeft,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  MessageSquare,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  MessageSquareHeart,
} from "lucide-react";
import { TicketCategory, TicketPriority, TicketStatus } from "@/types";
import { FeedbackModal } from "@/components/feedback-modal";

export default function SupportPage() {
  const {
    tickets,
    activeTicketId,
    setActiveTicketId,
    createTicket,
    addTicketComment,
    updateTicketStatus,
    setFeedbackModalOpen,
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
    <div className="min-h-screen bg-[#090d16] flex flex-col text-slate-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
              title="Return to Studio"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">Back to Studio</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">DocArch Support & Issue Tracker</h1>
                <p className="text-[10px] text-slate-400">Direct Engineering Assistance & Live Ticket Resolution</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-pink-400" />
              <span>Feedback</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Support Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Customer Support & Issue Tracker</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold">
                {tickets.length} Registered
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Log bugs, request architectural extensions, or track ongoing tickets with our solutions team.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("form");
                setActiveTicketId(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow ${
                activeTab === "form" && !activeTicketId
                  ? "bg-indigo-600 text-white shadow-indigo-600/30"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>New Ticket</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("track");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow ${
                activeTab === "track" || activeTicketId
                  ? "bg-indigo-600 text-white shadow-indigo-600/30"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Track Tickets ({tickets.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FORM */}
        {activeTab === "form" && !activeTicketId && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <h3 className="text-base font-bold text-white mb-1">Log a New Issue Ticket</h3>
              <p className="text-xs text-slate-400">
                Our engineering team reviews all incoming tickets and provides contextual replies.
              </p>
            </div>

            {ticketSubmitted && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-emerald-300 mb-6 animate-in fade-in">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm">Ticket Logged Successfully!</div>
                  <div className="text-xs text-emerald-400/90">
                    Tracking reference: <strong>{ticketSubmitted}</strong>. Switching to your ticket tracker...
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter name..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="engineer@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ticket Subject / Summary <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="e.g. Need assistance with multi-region LLD database replication diagram"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low (General guidance)</option>
                    <option value="medium">Medium (Standard priority)</option>
                    <option value="high">High (Impacting deliverable)</option>
                    <option value="critical">Critical (Blocking work)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detailed Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe your issue or request in full detail..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="page-diag-check"
                  checked={attachDiagnostics}
                  onChange={(e) => setAttachDiagnostics(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="page-diag-check" className="cursor-pointer text-xs text-slate-300">
                  <span className="font-semibold block text-slate-200">
                    Include current project context & environment diagnostics
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    Helps expedite resolution: Document: &quot;{currentProject.metadata.title}&quot; &bull; Level:{" "}
                    {(currentProject.designLevel || "hld").toUpperCase()} &bull; Domain: {currentProject.requirements.domain}.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: TRACK TICKETS */}
        {activeTab === "track" && !activeTicketId && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tickets by ID or title..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                {["all", "open", "in_review", "in_progress", "resolved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded font-bold capitalize transition ${
                      statusFilter === st ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-500">
                <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="font-semibold text-slate-300 text-sm">No support tickets found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Submit a new ticket using the button above to contact support.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicketId(t.id)}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between gap-4 group shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-cyan-400 font-bold">
                          {t.ticketNumber}
                        </span>
                        {getStatusBadge(t.status)}
                        {getPriorityBadge(t.priority)}
                        <span className="text-xs text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition">
                        {t.subject}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {t.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.comments.length}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TICKET THREAD DETAIL VIEW */}
        {activeTicket && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                onClick={() => setActiveTicketId(null)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Tickets</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Ticket Status:</span>
                <select
                  value={activeTicket.status}
                  onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value as TicketStatus)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {activeTicket.ticketNumber}
                  </span>
                  {getStatusBadge(activeTicket.status)}
                  {getPriorityBadge(activeTicket.priority)}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(activeTicket.createdAt).toLocaleString()}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">{activeTicket.subject}</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line mb-4">
                {activeTicket.description}
              </p>

              {activeTicket.diagnostics && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-wrap gap-x-5 gap-y-1 font-mono">
                  <span><strong>Project:</strong> {activeTicket.diagnostics.projectTitle}</span>
                  <span><strong>Level:</strong> {activeTicket.diagnostics.designLevel?.toUpperCase()}</span>
                  <span><strong>OS:</strong> {activeTicket.diagnostics.os}</span>
                </div>
              )}
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 pt-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Conversation History ({activeTicket.comments.length})
              </h4>

              <div className="space-y-3">
                {activeTicket.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      c.isStaff
                        ? "bg-indigo-950/30 border-indigo-500/30 ml-4"
                        : "bg-slate-900/80 border-slate-800 mr-4"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-bold ${c.isStaff ? "text-indigo-400" : "text-slate-200"}`}>
                        {c.author} {c.isStaff && "🛡️ (DocArch Staff)"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{c.timestamp}</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-line">{c.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendComment} className="flex gap-2 pt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Post a reply or provide additional details..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <FeedbackModal />
    </div>
  );
}
