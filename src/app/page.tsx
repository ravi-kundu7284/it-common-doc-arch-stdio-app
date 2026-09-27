"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { RequirementsWizard } from "@/components/requirements-wizard";
import { ArchitectureRecommender } from "@/components/architecture-recommender";
import { DocumentStudio } from "@/components/document-studio";
import { useDocStore } from "@/store/use-doc-store";

export default function Home() {
  const { activeTab } = useDocStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Initializing DocArch AI Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#090d16]">
      <Navbar />

      <div className="flex-1">
        {activeTab === "wizard" && <RequirementsWizard />}
        {activeTab === "recommender" && <ArchitectureRecommender />}
        {activeTab === "studio" && <DocumentStudio />}
      </div>
    </main>
  );
}
