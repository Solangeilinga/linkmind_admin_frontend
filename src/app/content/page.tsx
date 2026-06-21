"use client";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import { api }   from "@/lib/api";

interface Report { reason: string; details?: string; reportedAt: string; }
interface Author  { name?: string; email: string; }
interface Post {
  _id: string;
  content: string;
  isAnonymous: boolean;
  isVisible: boolean;
  reportCount: number;
  postType: string;
  createdAt: string;
  author?: Author;
  reports: Report[];
}
interface Stats { pending: number; hidden: number; total: number; }

type Action = { id: string; type: "hide" | "delete" } | null;

export default function ContentPage() {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction]   = useState<Action>(null);
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState("");
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [postsRes, statsRes] = await Promise.all([
        api.get<{ data: Post[]; pagination: any }>(`/api/content?page=${p}&limit=15`),
        api.get<Stats>("/api/content/stats"),
      ]);
      setPosts(postsRes.data);
      setTotalPages(postsRes.pagination.pages || 1);
      setStats(statsRes);
    } catch (e: any) {
      showToast("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  // Rejeter les signalements : post conservé, signalement clos
  const dismiss = async (id: string) => {
    try {
      await api.post(`/api/content/${id}/dismiss`, {});
      showToast("✅ Signalement rejeté — le post est conservé");
      setPosts(p => p.filter(x => x._id !== id));
      fetchData(page);
    } catch (e: any) { showToast("❌ " + e.message); }
  };

  // Confirmer une action (masquer ou supprimer)
  const confirmAction = async () => {
    if (!action || !reason.trim()) return;
    setSaving(true);
    try {
      if (action.type === "hide") {
        await api.post(`/api/content/${action.id}/hide`, { reason });
        showToast("✅ Post masqué");
      } else {
        await api.delete(`/api/content/${action.id}`, { reason });
        showToast("✅ Post supprimé définitivement");
      }
      setPosts(p => p.filter(x => x._id !== action.id));
      setAction(null); setReason("");
      fetchData(page);
    } catch (e: any) {
      showToast("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const typeLabel: Record<string, string> = {
    mood_share: "Humeur partagée", challenge_completed: "Défi complété",
    achievement: "Réussite", support: "Soutien", general: "Général",
    feeling: "Ressenti", question: "Question", success: "Succès", tip: "Conseil",
  };

  return (
    <AuthGuard>
      <AdminLayout>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Modération du contenu</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Posts signalés par la communauté — les publications se font directement sans validation
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Signalements en attente", value: stats.pending, color: "text-amber-600 bg-amber-50", icon: "⚠️" },
                { label: "Posts masqués",           value: stats.hidden,  color: "text-gray-600  bg-gray-50",  icon: "🚫" },
                { label: "Total des posts",         value: stats.total,   color: "text-blue-600  bg-blue-50",  icon: "📝" },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-4 flex items-center gap-3 border border-gray-100 bg-white`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info banner */}
          <div className="mb-5 flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <span className="text-base mt-0.5 flex-shrink-0">ℹ️</span>
            <div>
              <strong>Comment fonctionne la modération ?</strong> Les utilisateurs publient librement.
              Si un post est signalé, il apparaît ici. Tu peux <strong>rejeter le signalement</strong> (le post reste visible),
              <strong> masquer</strong> le post (invisible mais non supprimé), ou le <strong>supprimer définitivement</strong>.
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-20 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">✅</div>
              <div className="font-semibold text-gray-900">Aucun signalement en attente</div>
              <div className="text-sm text-gray-400 mt-1">La communauté est au calme 🌿</div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post._id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          ⚠️ {post.reportCount} signalement{post.reportCount > 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                          {typeLabel[post.postType] || post.postType}
                        </span>
                        {post.isAnonymous && (
                          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                            🔒 Anonyme
                          </span>
                        )}
                        {!post.isVisible && (
                          <span className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                            🚫 Masqué
                          </span>
                        )}
                      </div>

                      {/* Contenu */}
                      <p className="text-gray-900 text-sm leading-relaxed mb-3">{post.content}</p>

                      {/* Auteur + date */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {!post.isAnonymous && post.author && (
                          <span>👤 {post.author.name || post.author.email}</span>
                        )}
                        <span>{new Date(post.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}</span>
                      </div>

                      {/* Raisons des signalements */}
                      {post.reports?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-50">
                          <div className="text-xs text-gray-400 font-medium mb-1.5">Raisons signalées :</div>
                          <div className="flex flex-wrap gap-1.5">
                            {post.reports.slice(0, 3).map((r, i) => (
                              <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                                {r.reason}
                              </span>
                            ))}
                            {post.reports.length > 3 && (
                              <span className="text-xs text-gray-400">+{post.reports.length - 3} autres</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => dismiss(post._id)}
                        className="px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition whitespace-nowrap"
                        title="Rejeter le signalement — le post reste visible"
                      >
                        ✓ Pas de problème
                      </button>
                      <button
                        onClick={() => { setAction({ id: post._id, type: "hide" }); setReason(""); }}
                        className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition whitespace-nowrap"
                        title="Masquer le post (invisible mais non supprimé)"
                      >
                        👁 Masquer
                      </button>
                      <button
                        onClick={() => { setAction({ id: post._id, type: "delete" }); setReason(""); }}
                        className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition whitespace-nowrap"
                        title="Supprimer définitivement"
                      >
                        🗑 Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 pt-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-500">Page {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          )}

      {/* Modal confirmation action */}
      {action && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">
              {action.type === "hide" ? "Masquer ce post ?" : "Supprimer ce post ?"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {action.type === "hide"
                ? "Le post sera invisible pour les utilisateurs mais conservé en base."
                : "Cette action est irréversible. Le post sera définitivement supprimé."}
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Raison (obligatoire)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setAction(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={confirmAction} disabled={!reason.trim() || saving}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition ${
                  action.type === "hide"
                    ? "bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200"
                    : "bg-red-500 hover:bg-red-600 disabled:bg-gray-200"
                }`}>
                {saving ? "En cours..." : action.type === "hide" ? "Masquer" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50">
          {toast}
        </div>
      )}
    </AdminLayout>
    </AuthGuard>
  );
}