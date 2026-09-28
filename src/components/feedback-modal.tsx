"use client";

import React, { useState } from "react";
import { useSupportStore } from "@/store/use-support-store";
import { useAuthStore } from "@/store/use-auth-store";
import {
  MessageSquareHeart,
  Star,
  X,
  Send,
  CheckCircle2,
  Sparkles,
  ThumbsUp,
  History,
  Calendar,
} from "lucide-react";
import { FeedbackCategory, UserFeedback } from "@/types";

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Outstanding!",
};

export const FeedbackModal: React.FC = () => {
  const {
    feedbacks,
    isFeedbackModalOpen,
    setFeedbackModalOpen,
    submitFeedback,
  } = useSupportStore();

  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>("overall");
  const [likes, setLikes] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommendScore, setRecommendScore] = useState<number>(10);
  const [email, setEmail] = useState(user?.email || "");
  const [submitted, setSubmitted] = useState(false);

  if (!isFeedbackModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!likes.trim() && !improvements.trim()) return;

    submitFeedback({
      rating,
      category,
      likes: likes.trim(),
      improvements: improvements.trim(),
      recommendScore,
      userEmail: email.trim() || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setLikes("");
      setImprovements("");
      setActiveTab("history");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-indigo-500/20 text-pink-400 border border-pink-500/30">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>User Feedback & Suggestions</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Help us shape the future of DocArch AI Studio
              </p>
            </div>
          </div>
          <button
            onClick={() => setFeedbackModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 py-2.5">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "form"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Share Feedback</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "history"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Feedback ({feedbacks.length})</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitted ? (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Thank You for Your Feedback!</div>
                    <div className="text-[11px] text-emerald-400/90">
                      Your input directly influences our architectural roadmap and studio features.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Star Rating */}
                  <div className="text-center py-2">
                    <label className="block text-xs font-bold text-slate-200 mb-2">
                      How would you rate your overall experience with DocArch AI Studio?
                    </label>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (hoverRating || rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition transform hover:scale-110 focus:outline-none"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                active
                                  ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                  : "text-slate-700 hover:text-slate-500"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-semibold text-amber-400">
                      {RATING_LABELS[hoverRating || rating]}
                    </span>
                  </div>

                  {/* Feedback Category */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Feedback Focus Area
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="overall">🌐 Overall Product Experience</option>
                      <option value="ai_quality">🧠 AI Architecture & Synthesis Quality</option>
                      <option value="diagrams">📊 Mermaid Diagram & Visualizer Usability</option>
                      <option value="export">💾 HTML / Markdown Export & Printing</option>
                      <option value="templates">📁 Architecture Presets & Templates</option>
                      <option value="other">💡 Other Suggestions & Feature Requests</option>
                    </select>
                  </div>

                  {/* What do you like? */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      What do you like most about the platform?
                    </label>
                    <textarea
                      rows={2}
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      placeholder="e.g. Clean C4 diagrams, fast HLD/LLD switching, live split view editor..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* What can we improve? */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      What can we improve or what features are you missing? <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      required
                      placeholder="Share specific capabilities, integrations, or usability tweaks you'd love to see..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* NPS Recommendation Score (0 - 10) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      How likely are you to recommend DocArch AI Studio to an engineering colleague? (0 - 10)
                    </label>
                    <div className="grid grid-cols-11 gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setRecommendScore(score)}
                          className={`py-1.5 rounded text-[11px] font-bold transition ${
                            recommendScore === score
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                      <span>Not Likely</span>
                      <span>Extremely Likely</span>
                    </div>
                  </div>

                  {/* Optional Email */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Your Email (Optional, if you welcome follow-up on your feedback)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-pink-600/20 transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* PAST FEEDBACK HISTORY */
            <div className="space-y-3">
              {feedbacks.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <MessageSquareHeart className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-semibold text-slate-300">No feedback submitted yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your thoughts help us enhance the platform. Submit your feedback using the tab above.
                  </p>
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              fb.rating >= s
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1.5 capitalize font-medium">
                          ({fb.category.replace("_", " ")})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {fb.likes && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 block">What you liked:</span>
                        <p className="text-xs text-slate-300 mt-0.5">{fb.likes}</p>
                      </div>
                    )}

                    {fb.improvements && (
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 block">Suggestions for improvement:</span>
                        <p className="text-xs text-slate-300 mt-0.5">{fb.improvements}</p>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      NPS Score: <strong>{fb.recommendScore}/10</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
