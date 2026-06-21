"use client";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import StatCard  from "@/components/ui/StatCard";
import { api }   from "@/lib/api";

interface DashboardData {
  users: { total: number; active: number; banned: number; newToday: number; newWeek: number };
  system: { uptime: number; timestamp: string };
}
interface GrowthEntry { _id: string; count: number }
interface BookingStats {
  pending: number; confirmed: number; cancelled: number;
  completed: number; total: number; totalCommission: number;
}
interface ContentStats { pending: number; hidden: number; total: number; }

export default function ReportsPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [growth, setGrowth]     = useState<GrowthEntry[]>([]);
  const [bookings, setBookings] = useState<BookingStats | null>(null);
  const [content, setContent]   = useState<ContentStats | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>("/api/reports/dashboard"),
      api.get<{ data: GrowthEntry[] }>("/api/reports/users/growth"),
      api.get<BookingStats>("/api/bookings/stats").catch(() => null),
      api.get<ContentStats>("/api/content/stats").catch(() => null),
    ]).then(([d, g, b, c]) => {
      setData(d);
      setGrowth(g.data);
      if (b) setBookings(b);
      if (c) setContent(c);
    }).finally(() => setLoading(false));
  }, []);

  const maxCount = Math.max(...growth.map(g => g.count), 1);

  return (
    <AuthGuard>
      <AdminLayout>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Statistiques et croissance de la plateforme</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400">Chargement des données...</div>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                <StatCard label="Total utilisateurs"    value={data.users.total}    icon="👥" color="indigo" />
                <StatCard label="Actifs"                value={data.users.active}   icon="✅" color="green"  />
                <StatCard label="Bannis"                value={data.users.banned}   icon="🚫" color="red"    />
                <StatCard label="Nouveaux cette semaine" value={data.users.newWeek} icon="📈" color="blue"   />
              </div>

              {/* Stats réservations */}
              {bookings && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-2">Réservations</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                    <StatCard label="Total réservations" value={bookings.total}     icon="📅" color="indigo" />
                    <StatCard label="Confirmées"         value={bookings.confirmed} icon="✅" color="green"  />
                    <StatCard label="Annulées"           value={bookings.cancelled} icon="❌" color="red"    />
                    <StatCard label="Commission totale"  value={`${(bookings.totalCommission ?? 0).toLocaleString()} FCFA`} icon="💰" color="purple" />
                  </div>
                </>
              )}

              {/* Stats contenu */}
              {content && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-2">Modération</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    <StatCard label="Total posts"              value={content.total}   icon="📝" color="blue"  />
                    <StatCard label="Signalements en attente"  value={content.pending} icon="⚠️" color="amber" />
                    <StatCard label="Posts masqués"            value={content.hidden}  icon="🚫" color="red"   />
                  </div>
                </>
              )}

              {/* Growth chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Inscriptions — 30 derniers jours</h2>
                <p className="text-xs text-gray-400 mb-6">Nombre de nouveaux comptes par jour</p>

                {growth.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Aucune donnée disponible pour cette période
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {/* Axe Y */}
                    <div className="flex flex-col justify-between text-[10px] text-gray-400 text-right pb-5" style={{ minWidth: "24px" }}>
                      <span>{maxCount}</span>
                      <span>{Math.round(maxCount * 0.75)}</span>
                      <span>{Math.round(maxCount * 0.5)}</span>
                      <span>{Math.round(maxCount * 0.25)}</span>
                      <span>0</span>
                    </div>
                    {/* Barres */}
                    <div className="flex-1">
                      <div className="flex items-end gap-1 h-40 border-b border-gray-100">
                        {growth.map(g => (
                          <div key={g._id} className="flex-1 flex flex-col items-center gap-1 group">
                            <div
                              className="w-full bg-indigo-100 hover:bg-indigo-400 rounded-t-md transition-colors relative"
                              style={{ height: `${(g.count / maxCount) * 100}%`, minHeight: "4px" }}
                              title={`${g._id}: ${g.count} inscription(s)`}
                            >
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition z-10">
                                {g.count}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Axe X — dates espacées */}
                      <div className="flex justify-between mt-1.5 px-1">
                        {[0, Math.floor(growth.length / 2), growth.length - 1].map(i => (
                          <span key={i} className="text-[9px] text-gray-400">{growth[i]?._id?.slice(5)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </AdminLayout>
    </AuthGuard>
  );
}