"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";

interface Props { children: React.ReactNode; }

export function AdminLayout({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F3F0]">

      {/* ── Bouton hamburger — visible uniquement mobile ──────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="
          fixed top-4 left-4 z-50
          w-10 h-10 rounded-xl
          bg-[#77021D] text-white
          flex items-center justify-center
          shadow-lg shadow-[#77021D]/30
          lg:hidden
        "
        aria-label="Ouvrir le menu"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
          <rect x="0" y="0"  width="18" height="2" rx="1" fill="white"/>
          <rect x="0" y="6"  width="14" height="2" rx="1" fill="white"/>
          <rect x="0" y="12" width="18" height="2" rx="1" fill="white"/>
        </svg>
      </button>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <main className="
        lg:ml-64
        min-h-screen
        p-6 lg:p-8
        pt-16 lg:pt-8
      ">
        {children}
      </main>
    </div>
  );
}