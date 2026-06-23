"use client";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import { api }   from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserAnon { displayName: string; city?: string; age?: number; }
interface Professional { fullName: string; type: string; city?: string; sessionPrice?: number; currency?: string; }
interface AdminLog {
  event: string; proName: string; type?: string;
  scheduledAt?: string; confirmedAt?: string; completedAt?: string;
  meetingLink?: string; createdAt: string;
}
interface Booking {
  _id: string;
  user: UserAnon;
  professional: Professional;
  consultationType: "in_person" | "online";
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  scheduledAt?: string;
  preferredDate?: string;
  meetingLink?: string;
  meetingProvider?: string;
  sessionPrice?: number;
  commissionAmount?: number;
  adminNote?: string;
  adminLog?: AdminLog[];
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
}
interface Stats { pending: number; confirmed: number; cancelled: number; completed: number; total: number; }
type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Ouagadougou",
  });
}
function providerIcon(p?: string) {
  if (p === "zoom") return "🔵";
  if (p === "whereby") return "📹";
  return "🎥";
}
function eventLabel(event: string) {
  const map: Record<string, string> = {
    booking_created:        "📩 Demande créée",
    booking_confirmed_by_pro: "✅ Confirmée par le professionnel",
    session_completed:      "🏁 Séance terminée",
  };
  return map[event] || event;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [stats,    setStats]        = useState<Stats | null>(null);
  const [status,   setStatus]       = useState<StatusFilter>("pending");
  const [loading,  setLoading]      = useState(true);
  const [page,     setPage]         = useState(1);
  const [totalPages,setTotalPages]  = useState(1);
  const [logModal, setLogModal]     = useState<Booking | null>(null);
  const [cancelModal,setCancelModal]= useState<Booking | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [saving,   setSaving]       = useState(false);
  const [toast,    setToast]        = useState("");

  const showToast = (msg: string, dur = 4000) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const qs = status !== "all" ? `&status=${status}` : "";
      const [bRes, sRes] = await Promise.all([
        api.get<{ data: Booking[]; pagination: any }>(`/api/bookings?page=${p}&limit=15${qs}`),
        api.get<Stats>("/api/bookings/stats").catch(() => null),
      ]);
      setBookings(bRes.data || []);
      setTotalPages(bRes.pagination?.pages || 1);
      if (sRes) setStats(sRes);
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { fetchData(page); }, [fetchData, page]);

  const cancelBooking = async () => {
    if (!cancelModal || !cancelNote.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/bookings/${cancelModal._id}/cancel`, { reason: cancelNote });
      showToast("✅ Réservation annulée — email envoyé à l'utilisateur.");
      setCancelModal(null); setCancelNote(""); fetchData(page);
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  };

  const completeBooking = async (b: Booking) => {
    if (!confirm("Marquer cette séance comme terminée ?")) return;
    try {
      await api.patch(`/api/bookings/${b._id}/complete`, {});
      showToast("✅ Séance marquée comme terminée — traçabilité enregistrée.");
      fetchData(page);
    } catch (e: any) { showToast("❌ " + e.message); }
  };

  const statusColors: Record<string, string> = {
    pending:   "text-amber-700  bg-amber-50  border-amber-200",
    confirmed: "text-green-700  bg-green-50  border-green-200",
    cancelled: "text-red-600    bg-red-50    border-red-200",
    completed: "text-gray-600   bg-gray-50   border-gray-200",
    no_show:   "text-orange-600 bg-orange-50 border-orange-200",
  };
  const statusLabels: Record<string, string> = {
    pending:   "⏳ En attente (pro doit confirmer)",
    confirmed: "✅ Confirmée",
    cancelled: "❌ Annulée",
    completed: "✔ Terminée",
    no_show:   "👻 Non présenté",
  };
  const typeLabels: Record<string, string> = {
    in_person: "🏢 Présentiel", online: "💻 En ligne",
  };
  const proTypes: Record<string, string> = {
    psychologist: "Psychologue", coach: "Coach", doctor: "Médecin",
  };
  const filters: { key: StatusFilter; label: string }[] = [
    { key: "pending",   label: "En attente" },
    { key: "confirmed", label: "Confirmées" },
    { key: "completed", label: "Terminées" },
    { key: "cancelled", label: "Annulées" },
    { key: "no_show",   label: "Non présentés" },
    { key: "all",       label: "Toutes" },
  ];

  return (
    <AuthGuard>
      <AdminLayout>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                🔒 Identités masquées
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Le professionnel confirme directement par email. L&apos;admin supervise et peut annuler si nécessaire.
            </p>
          </div>

          {/* Bandeau flux */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 mb-6 text-sm text-blue-800">
            <strong>Flux de confirmation :</strong> Étudiant fait une demande →
            <span className="mx-1 text-blue-500">📧</span> Email au professionnel →
            <span className="mx-1 text-blue-500">✅</span> Pro confirme via le lien →
            <span className="mx-1 text-blue-500">🔗</span> Lien Zoom généré automatiquement →
            <span className="mx-1 text-blue-500">📧</span> Emails de confirmation aux deux parties
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "En attente",  value: stats.pending,   icon: "⏳", c: "text-amber-600 bg-amber-50" },
                { label: "Confirmées",  value: stats.confirmed, icon: "✅", c: "text-green-600 bg-green-50" },
                { label: "Terminées",   value: stats.completed, icon: "✔",  c: "text-blue-600  bg-blue-50"  },
                { label: "Annulées",    value: stats.cancelled, icon: "❌", c: "text-red-600   bg-red-50"   },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${s.c}`}>{s.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-xl leading-none">{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filtres */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {filters.map(f => (
              <button key={f.key} onClick={() => setStatus(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  status === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}>
                {f.label}
                {f.key === "pending" && stats?.pending ? (
                  <span className="ml-1.5 text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5">{stats.pending}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Liste */}
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-32" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="font-semibold text-gray-900">Aucune réservation</div>
              <div className="text-sm text-gray-400 mt-1">
                {status === "pending" ? "Aucune demande en attente de confirmation ✅" : "Aucun résultat"}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <div key={b._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition">
                  <div className="flex items-start gap-4">

                    {/* Avatar pro */}
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {b.professional?.fullName?.[0] ?? "P"}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Titre */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {b.professional?.fullName}
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              {proTypes[b.professional?.type] || b.professional?.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Demande de <strong className="font-mono">{b.user?.displayName}</strong>
                            {b.user?.city ? ` · 📍 ${b.user.city}` : ""}
                            {b.user?.age  ? ` · ${b.user.age} ans` : ""}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[b.status]}`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </div>

                      {/* Métadonnées */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
                        <span>{typeLabels[b.consultationType]}</span>
                        {b.scheduledAt ? (
                          <span className="text-indigo-600 font-medium">📅 {fmtDateTime(b.scheduledAt)}</span>
                        ) : b.preferredDate ? (
                          <span>📅 {b.preferredDate}</span>
                        ) : null}
                        {b.sessionPrice && (
                          <span>💰 {b.sessionPrice.toLocaleString()} {b.professional?.currency || "FCFA"}</span>
                        )}
                        {b.commissionAmount && (
                          <span className="text-purple-600 font-medium">Commission : {b.commissionAmount.toLocaleString()} FCFA</span>
                        )}
                        <span className="text-gray-300">·</span>
                        <span>Reçue le {fmtDate(b.createdAt)}</span>
                      </div>

                      {/* Lien visio (généré après confirmation) */}
                      {b.meetingLink && (
                        <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                          <span className="text-base">{providerIcon(b.meetingProvider)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-blue-700 mb-0.5">
                              Lien {b.meetingProvider === "zoom" ? "Zoom" : "visioconférence"} — généré automatiquement
                            </div>
                            <a href={b.meetingLink} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block">
                              {b.meetingLink}
                            </a>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(b.meetingLink!); showToast("🔗 Lien copié !"); }}
                            className="text-xs text-blue-500 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50">
                            Copier
                          </button>
                        </div>
                      )}

                      {/* Statut "en attente" — info sur le flux */}
                      {b.status === "pending" && (
                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                          ⏳ En attente de confirmation par le professionnel. Un email avec un lien de confirmation lui a été envoyé.
                        </div>
                      )}

                      {/* Note admin */}
                      {b.adminNote && (
                        <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5">
                          📋 {b.adminNote}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {/* Voir la traçabilité */}
                        {(b.adminLog?.length || 0) > 0 && (
                          <button onClick={() => setLogModal(b)}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition">
                            📋 Traçabilité ({b.adminLog!.length})
                          </button>
                        )}

                        {/* Marquer terminé */}
                        {b.status === "confirmed" && (
                          <button onClick={() => completeBooking(b)}
                            className="px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition">
                            ✔ Marquer terminée
                          </button>
                        )}

                        {/* Annuler (admin peut annuler pending ou confirmed) */}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <button onClick={() => { setCancelModal(b); setCancelNote(""); }}
                            className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition">
                            ❌ Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 pt-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">← Précédent</button>
                  <span className="px-4 py-2 text-sm text-gray-500">Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">Suivant →</button>
                </div>
              )}
            </div>
          )}

      {/* ── Modal Traçabilité admin (en DB, pas de mail) ── */}
      {logModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">📋 Journal de traçabilité</h2>
              <button onClick={() => setLogModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="text-xs text-gray-500 mb-4 bg-indigo-50 rounded-xl px-4 py-2.5">
              Ce journal est interne à LinkMind. Aucun email n&apos;est envoyé aux admins — conformité RGPD.
            </div>
            <div className="space-y-3">
              {logModal.adminLog?.map((log, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="font-semibold text-sm text-gray-900 mb-1">{eventLabel(log.event)}</div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Professionnel : <strong>{log.proName}</strong></div>
                    {log.type && <div>Canal : {log.type === "online" ? "💻 En ligne" : "🏢 Présentiel"}</div>}
                    {log.scheduledAt && <div>Créneau : {fmtDateTime(log.scheduledAt)}</div>}
                    {log.confirmedAt && <div>Confirmé le : {fmtDate(log.confirmedAt)}</div>}
                    {log.completedAt && <div>Terminé le : {fmtDate(log.completedAt)}</div>}
                    {log.meetingLink && (
                      <div>Lien visio : <a href={log.meetingLink} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">{log.meetingLink}</a></div>
                    )}
                    <div className="text-gray-300 pt-1">{new Date(log.createdAt).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setLogModal(null)}
              className="mt-5 w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Annuler ── */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">Annuler la réservation</h2>
            <p className="text-sm text-gray-500 mb-4">
              Un email d&apos;annulation sera envoyé à l&apos;utilisateur. Le professionnel n&apos;est pas notifié par email.
            </p>
            <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)}
              placeholder="Raison de l'annulation (obligatoire)..." rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Retour</button>
              <button onClick={cancelBooking} disabled={!cancelNote.trim() || saving}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {saving ? "En cours..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50 whitespace-pre-line max-w-sm">
          {toast}
        </div>
      )}
    </AdminLayout>
    </AuthGuard>
  );
}