"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession, isAuthenticated } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  useEffect(() => { if (isAuthenticated()) router.replace("/dashboard"); }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post<{ token: string; admin: object }>("/api/auth/login", form);
      saveSession(res.token, res.admin);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF7F5 50%, #FFF8EE 100%)" }}>
      <div className="w-full max-w-md">

        {/* Logo + titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg overflow-hidden bg-[#77021D]">
            <Image
              src="/logo.png"
              alt="BasYam"
              width={80}
              height={80}
              className="object-contain"
              onError={() => {}}
            />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">BasYam Admin</h1>
          <p className="text-sm mt-1" style={{ color: "#9A8A8A" }}>Panneau d&apos;administration</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-xl p-8"
          style={{ border: "1px solid #EDE0DC" }}>

          {/* Erreur */}
          {error && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl text-sm font-medium"
              style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B6060" }}>
                Email administrateur
              </label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@basyam.app" disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl text-sm transition outline-none"
                style={{ border: "1px solid #EDE0DC", background: "#FAFAFA" }}
                onFocus={e => e.target.style.boxShadow = "0 0 0 3px rgba(119,2,29,0.15)"}
                onBlur={e => e.target.style.boxShadow = "none"}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#6B6060" }}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" disabled={loading}
                  className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm transition outline-none"
                  style={{ border: "1px solid #EDE0DC", background: "#FAFAFA" }}
                  onFocus={e => e.target.style.boxShadow = "0 0 0 3px rgba(119,2,29,0.15)"}
                  onBlur={e => e.target.style.boxShadow = "none"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 font-semibold text-sm rounded-xl transition text-white mt-2"
              style={{
                background: loading ? "#D1D5DB" : "linear-gradient(135deg, #77021D 0%, #A00328 100%)",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "#9A8A8A" }}>
            🔒 Accès réservé aux administrateurs · Toutes les actions sont enregistrées
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#C4B0B0" }}>
          BasYam © {new Date().getFullYear()} — Bien-être des jeunes africains
        </p>
      </div>
    </div>
  );
}