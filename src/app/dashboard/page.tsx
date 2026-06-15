"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import StatCard  from "@/components/ui/StatCard";
import { api, getAdmin } from "@/lib/api";

type AdminRole = "super_admin" | "admin" | "moderator" | "analyst";

export default function DashboardPage() {
  const admin = getAdmin();
  const role: AdminRole = admin?.role || "analyst";

  const [data,     setData]     = useState<any>(null);
  const [bookings, setBookings] = useState<any>(null);
  const [content,  setContent]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const calls: Promise<any>[] = [api.get("/api/reports/dashboard")];
    if (role !== "analyst") {
      calls.push(api.get("/api/bookings/stats"));
      calls.push(api.get("/api/content/stats"));
    }
    Promise.all(calls)
      .then(([d, b, c]) => { setData(d); setBookings(b); setContent(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [role]);

  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // Actions rapides selon le rôle
  const quickActions = [
    { href:"/bookings",      icon:"📅", label:"Valider réservations",   color:"bg-amber-50 text-amber-700",   badge:bookings?.pending,  minRole:"admin"     },
    { href:"/content",       icon:"🚨", label:"Traiter signalements",   color:"bg-red-50 text-red-700",       badge:content?.pending,   minRole:"moderator" },
    { href:"/users",         icon:"👥", label:"Gérer utilisateurs",     color:"bg-indigo-50 text-indigo-700", badge:0,                  minRole:"admin"     },
    { href:"/challenges",    icon:"🏆", label:"Gérer défis",            color:"bg-green-50 text-green-700",   badge:0,                  minRole:"admin"     },
    { href:"/professionals", icon:"👨‍⚕️", label:"Gérer professionnels",  color:"bg-blue-50 text-blue-700",     badge:0,                  minRole:"admin"     },
    { href:"/ads",           icon:"📢", label:"Gérer annonces",         color:"bg-purple-50 text-purple-700", badge:0,                  minRole:"admin"     },
    { href:"/reports",       icon:"📈", label:"Voir les rapports",      color:"bg-teal-50 text-teal-700",     badge:0,                  minRole:"analyst"   },
  ].filter(a => {
    const h = { super_admin:4, admin:3, moderator:2, analyst:1 };
    return (h[role]||0) >= (h[a.minRole as AdminRole]||0);
  });

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {greet}, {admin?.name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ⚠️ {error} — Vérifiez que le backend tourne sur le port 3000.
            </div>
          )}

          {/* Alertes urgentes */}
          {!loading && ((bookings?.pending ?? 0) > 0 || (content?.pending ?? 0) > 0) && (
            <div className="mb-6 flex flex-wrap gap-3">
              {(bookings?.pending ?? 0) > 0 && (
                <Link href="/bookings" className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 hover:bg-amber-100 transition no-underline font-medium">
                  📅 <strong>{bookings.pending}</strong> réservation{bookings.pending > 1 ? "s" : ""} en attente →
                </Link>
              )}
              {(content?.pending ?? 0) > 0 && (
                <Link href="/content" className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 hover:bg-red-100 transition no-underline font-medium">
                  🚨 <strong>{content.pending}</strong> signalement{content.pending > 1 ? "s" : ""} à traiter →
                </Link>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {Array(8).fill(0).map((_,i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-24"/>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Utilisateurs */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Utilisateurs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
                <StatCard label="Total"                 value={data?.users.total    ?? 0} icon="👥" color="indigo"/>
                <StatCard label="Actifs"                value={data?.users.active   ?? 0} icon="✅" color="green"/>
                <StatCard label="Bannis"                value={data?.users.banned   ?? 0} icon="🚫" color="red"/>
                <StatCard label="Nouveaux aujourd'hui"  value={data?.users.newToday ?? 0} icon="🆕" color="blue"
                  sub={`${data?.users.newWeek ?? 0} cette semaine`}/>
              </div>

              {/* Stats Réservations (admin+) */}
              {bookings && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-2">Réservations</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
                    <StatCard label="En attente"        value={bookings.pending   ?? 0} icon="⏳" color="amber" sub="À valider"/>
                    <StatCard label="Confirmées"        value={bookings.confirmed ?? 0} icon="✅" color="green"/>
                    <StatCard label="Terminées"         value={bookings.completed ?? 0} icon="✔"  color="blue"/>
                    <StatCard
                      label="Commission totale"
                      value={`${(bookings.totalCommission ?? 0).toLocaleString()} FCFA`}
                      icon="💰" color="purple"/>
                  </div>
                </>
              )}

              {/* Actions rapides */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map(a => (
                      <Link key={a.href} href={a.href}
                        className={`relative flex items-center gap-2 p-3.5 rounded-xl text-sm font-semibold hover:opacity-80 transition no-underline ${a.color}`}>
                        <span>{a.icon}</span>
                        <span className="text-xs">{a.label}</span>
                        {(a.badge ?? 0) > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {a.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Infos système */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Système</h2>
                  <dl className="space-y-3">
                    {[
                      { label:"Statut API",            value: <span className="flex items-center gap-1.5 text-green-600 font-semibold text-sm"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>En ligne</span> },
                      { label:"Uptime",                value: `${Math.floor((data?.system.uptime ?? 0) / 60)} min` },
                      { label:"Votre rôle",            value: <span className="font-semibold text-indigo-600">{admin?.role}</span> },
                      { label:"Signalements actifs",   value: <span className={content?.pending ? "text-red-600 font-semibold" : "text-gray-900"}>{content?.pending ?? "—"}</span> },
                      { label:"Réservations pending",  value: <span className={bookings?.pending ? "text-amber-600 font-semibold" : "text-gray-900"}>{bookings?.pending ?? "—"}</span> },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                        <dt className="text-sm text-gray-500">{row.label}</dt>
                        <dd className="text-sm text-gray-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
