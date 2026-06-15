"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api }   from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
// NOTE CONFIDENTIALITÉ : l'API ne retourne jamais l'email ni le vrai nom.
// Seul l'alias anonymisé + métadonnées non-identifiantes sont exposés.
interface User {
  _id: string;
  anonymousAlias: string;   // ex: "BraveLion42" — généré à l'inscription
  city?: string;
  age?: number;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
  streakDays?: number;
  totalBookings?: number;
}
interface UsersRes {
  data: User[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
type Filter = "all" | "active" | "banned" | "new";

// ─── Composant ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [pag,     setPag]     = useState({ page: 1, total: 0, pages: 1 });
  const [filter,  setFilter]  = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState<User | null>(null);
  const [banReason,setBanReason] = useState("");
  const [acting,  setActing]  = useState(false);
  const [toast,   setToast]   = useState("");

  const showToast = (msg: string, dur = 3000) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", filter });
      const res = await api.get<UsersRes>(`/api/users?${params}`);
      setUsers(res.data);
      setPag({ page: res.pagination.page, total: res.pagination.total, pages: res.pagination.pages });
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const banUser = async () => {
    if (!selected || !banReason.trim()) return;
    setActing(true);
    try {
      await api.post(`/api/users/${selected._id}/ban`, { reason: banReason });
      showToast("✅ Utilisateur banni"); setSelected(null); setBanReason(""); fetchUsers();
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setActing(false); }
  };

  const unbanUser = async (user: User) => {
    if (!confirm(`Débannir ${user.anonymousAlias} ?`)) return;
    try {
      await api.post(`/api/users/${user._id}/unban`, {});
      showToast("✅ Utilisateur débanni"); fetchUsers();
    } catch (e: any) { showToast("❌ " + e.message); }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" }, { key: "active", label: "Actifs" },
    { key: "banned", label: "Bannis" }, { key: "new", label: "Nouveaux" },
  ];

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
              {/* Badge confidentialité */}
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                🔒 Données anonymisées
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {pag.total} comptes — les identités réelles ne sont jamais affichées ici.
            </p>
          </div>

          {/* Bandeau confidentialité */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 mb-6 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🛡️</span>
            <div className="text-sm text-indigo-800">
              <strong>Protection de la vie privée :</strong> les emails, noms complets et numéros de téléphone
              des utilisateurs sont masqués dans cette interface conformément à la politique de confidentialité
              de LinkMind. Seul un alias anonymisé est visible à des fins de modération.
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Alias anonyme</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Localisation</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Statut</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Inscrit</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Activité</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                          <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
                        </div>
                      </td>
                      {Array(5).fill(0).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <div className="text-3xl mb-2">📭</div>
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : users.map(user => (
                  <tr key={user._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">

                    {/* Alias anonyme */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                          {user.anonymousAlias?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 font-mono text-sm">
                            {user.anonymousAlias || `User_${user._id.slice(-6)}`}
                          </div>
                          {/* ID tronqué pour référence de modération uniquement */}
                          <div className="text-gray-300 text-xs font-mono">
                            #{user._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Localisation non-identifiante */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {user.city ? `📍 ${user.city}` : "—"}
                      {user.age ? <span className="ml-2">{user.age} ans</span> : null}
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-3.5">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                          🚫 Banni
                        </span>
                      ) : user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                          ● Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                          ○ Inactif
                        </span>
                      )}
                    </td>

                    {/* Date inscription */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—"}
                    </td>

                    {/* Activité */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span title="Streak">{user.streakDays ?? 0} 🔥</span>
                        {user.totalBookings !== undefined && (
                          <span title="Consultations">{user.totalBookings} 📅</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {user.isBanned ? (
                        <button onClick={() => unbanUser(user)}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
                          Débannir
                        </button>
                      ) : (
                        <button onClick={() => setSelected(user)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition">
                          Bannir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pag.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <span className="text-xs text-gray-400">Page {pag.page} / {pag.pages} · {pag.total} utilisateurs</span>
                <div className="flex gap-2">
                  <button disabled={pag.page <= 1} onClick={() => fetchUsers(pag.page - 1)}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <button disabled={pag.page >= pag.pages} onClick={() => fetchUsers(pag.page + 1)}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Ban */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">Bannir l&apos;utilisateur</h2>
            <p className="text-sm text-gray-500 mb-1">
              Alias : <strong className="font-mono">{selected.anonymousAlias}</strong>
            </p>
            <p className="text-xs text-gray-400 mb-5">
              L&apos;accès sera bloqué immédiatement. L&apos;identité réelle n&apos;est pas affichée ici.
            </p>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Raison du bannissement (obligatoire)..." rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setSelected(null); setBanReason(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={banUser} disabled={!banReason.trim() || acting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {acting ? "En cours..." : "Confirmer le ban"}
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
    </AuthGuard>
  );
}
