"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

interface User {
  _id: string;
  anonymousAlias?: string;
  email: string;
  age?: number;
  city?: string;
  country?: string;
  gender?: string;
  totalPoints: number;
  streakDays: number;
  level: string;
  isActive: boolean;
  deletedAt?: string | null;
  banReason?: string;
  createdAt: string;
}

type Filter = "all" | "active" | "deleted" | "new";

// ── Étapes de suppression ────────────────────────────────────────────────────
type DeleteStep = 1 | 2 | 3;

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [pag,     setPag]     = useState({ page: 1, total: 0, pages: 1 });
  const [filter,  setFilter]  = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState("");

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm]   = useState({ email: "", password: "", anonymousAlias: "", age: "", city: "", country: "", gender: "non_specifie" });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete modal — 3 étapes
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteStep,   setDeleteStep]   = useState<DeleteStep>(1);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting,     setDeleting]     = useState(false);
  const [restoring,    setRestoring]    = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<{ data: User[]; pagination: any }>(
        `/api/users?page=${p}&limit=20&filter=${filter}`
      );
      setUsers(res.data || []);
      setPag(res.pagination || { page: p, total: 0, pages: 1 });
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  // ── Création utilisateur ──────────────────────────────────────────────────
  const createUser = async () => {
    setCreateError("");
    if (!createForm.email || !createForm.password) { setCreateError("Email et mot de passe sont requis."); return; }
    setCreating(true);
    try {
      await api.post("/api/users", { ...createForm, age: createForm.age ? Number(createForm.age) : undefined });
      showToast("✅ Utilisateur créé");
      setCreateModal(false);
      setCreateForm({ email: "", password: "", anonymousAlias: "", age: "", city: "", country: "", gender: "non_specifie" });
      fetchUsers(1);
    } catch (e: any) {
      setCreateError(e.message || "Erreur lors de la création.");
    } finally { setCreating(false); }
  };

  // ── Suppression douce en 3 étapes ─────────────────────────────────────────
  const openDelete = (user: User) => { setDeleteTarget(user); setDeleteStep(1); setDeleteReason(""); };

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    setDeleting(true);
    try {
      await api.post(`/api/users/${deleteTarget._id}/soft-delete`, { reason: deleteReason });
      showToast("✅ Compte supprimé");
      setDeleteTarget(null);
      fetchUsers(pag.page);
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setDeleting(false); }
  };

  const restoreUser = async (user: User) => {
    setRestoring(user._id);
    try {
      await api.post(`/api/users/${user._id}/restore`, {});
      showToast("✅ Compte restauré");
      fetchUsers(pag.page);
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setRestoring(null); }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all",     label: "Tous" },
    { key: "active",  label: "Actifs" },
    { key: "deleted", label: "Supprimés" },
    { key: "new",     label: "Nouveaux" },
  ];

  return (
    <AuthGuard>
      <AdminLayout>

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#77021D] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  🔒 Données anonymisées
                </span>
              </div>
              <p className="text-sm text-gray-500">{pag.total} comptes enregistrés</p>
            </div>
            <button onClick={() => { setCreateModal(true); setCreateError(""); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] transition whitespace-nowrap">
              + Ajouter un utilisateur
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === f.key ? "bg-[#77021D] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Utilisateur</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide max-md:hidden">Localisation</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide max-md:hidden">Points / Streak</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide max-md:hidden">Inscrit</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? Array(5).fill(0).map((_,i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-100" /><div className="h-4 bg-gray-100 rounded w-32" /></div></td>
                      <td className="px-5 py-4 max-md:hidden"><div className="h-3 bg-gray-100 rounded w-24" /></td>
                      <td className="px-5 py-4 max-md:hidden"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                      <td className="px-5 py-4 max-md:hidden"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                      <td className="px-5 py-4" />
                    </tr>
                  )) : users.map(user => (
                    <tr key={user._id} className={`hover:bg-gray-50 transition ${user.deletedAt ? "opacity-60" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#77021D]/10 text-[#77021D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(user.anonymousAlias?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {user.anonymousAlias || <span className="text-gray-400 italic">Sans pseudo</span>}
                            </div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </div>
                          {user.deletedAt && (
                            <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full font-semibold">Supprimé</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-md:hidden">
                        {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-4 max-md:hidden">
                        <span className="text-sm font-medium text-gray-900">{user.totalPoints} pts</span>
                        <span className="text-xs text-gray-400 ml-2">🔥 {user.streakDays}j</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400 max-md:hidden">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {user.deletedAt ? (
                            <button onClick={() => restoreUser(user)} disabled={restoring === user._id}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition disabled:opacity-50">
                              {restoring === user._id ? "..." : "Restaurer"}
                            </button>
                          ) : (
                            <button onClick={() => openDelete(user)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pag.pages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Page {pag.page} / {pag.pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => fetchUsers(pag.page - 1)} disabled={pag.page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <button onClick={() => fetchUsers(pag.page + 1)} disabled={pag.page >= pag.pages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
      </AdminLayout>

      {/* ── Modal créer utilisateur ─────────────────────────────────────────── */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto">
            <h2 className="font-bold text-gray-900 mb-4">Créer un utilisateur</h2>

            {/* Erreur visible EN HAUT du modal */}
            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                ⚠️ {createError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                <input type="email" value={createForm.email} placeholder="email@exemple.com"
                  onChange={e => { setCreateForm(p => ({ ...p, email: e.target.value })); setCreateError(""); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Mot de passe *</label>
                <input type="password" value={createForm.password} placeholder="Min. 6 caractères"
                  onChange={e => { setCreateForm(p => ({ ...p, password: e.target.value })); setCreateError(""); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Pseudo anonyme</label>
                <input type="text" value={createForm.anonymousAlias} placeholder="Ex: LionCourageux"
                  onChange={e => setCreateForm(p => ({ ...p, anonymousAlias: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Âge</label>
                  <input type="number" value={createForm.age} placeholder="22" min="13" max="120"
                    onChange={e => setCreateForm(p => ({ ...p, age: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Genre</label>
                  <select value={createForm.gender} onChange={e => setCreateForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20 bg-white">
                    <option value="non_specifie">Non spécifié</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ville</label>
                  <input type="text" value={createForm.city} placeholder="Ouagadougou"
                    onChange={e => setCreateForm(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Pays</label>
                  <input type="text" value={createForm.country} placeholder="Burkina Faso"
                    onChange={e => setCreateForm(p => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                ℹ️ L&apos;email sera considéré comme vérifié. L&apos;utilisateur peut se connecter immédiatement.
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setCreateModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={createUser} disabled={creating}
                className="flex-1 py-2.5 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] disabled:opacity-50">
                {creating ? "Création..." : "Créer l'utilisateur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression 3 étapes ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">

            {/* Indicateur étapes */}
            <div className="flex items-center gap-2 mb-5">
              {[1,2,3].map(s => (
                <div key={s} className={`flex items-center gap-2 flex-1 ${s < 3 ? "after:content-[''] after:flex-1 after:h-px after:bg-gray-200" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    deleteStep > s ? "bg-green-500 text-white" : deleteStep === s ? "bg-[#77021D] text-white" : "bg-gray-100 text-gray-400"
                  }`}>{deleteStep > s ? "✓" : s}</div>
                </div>
              ))}
            </div>

            {/* Étape 1 — Confirmation initiale */}
            {deleteStep === 1 && (
              <>
                <h2 className="font-bold text-gray-900 mb-2">Supprimer ce compte ?</h2>
                <div className="p-3 bg-gray-50 rounded-xl mb-4">
                  <div className="font-semibold text-sm">{deleteTarget.anonymousAlias || "Sans pseudo"}</div>
                  <div className="text-xs text-gray-400">{deleteTarget.email}</div>
                </div>
                <p className="text-sm text-gray-600 mb-5">
                  Cette action est <strong>réversible</strong> — le compte sera masqué mais les données conservées pendant 30 jours.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
                  <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Continuer →</button>
                </div>
              </>
            )}

            {/* Étape 2 — Motif */}
            {deleteStep === 2 && (
              <>
                <h2 className="font-bold text-gray-900 mb-2">Motif de suppression</h2>
                <p className="text-sm text-gray-500 mb-4">Ce motif sera enregistré dans les logs de modération.</p>
                <div className="space-y-2 mb-4">
                  {["Violation des conditions d'utilisation", "Contenu inapproprié répété", "Demande de l'utilisateur", "Compte inactif > 1 an", "Autre"].map(r => (
                    <button key={r} onClick={() => setDeleteReason(r)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition ${
                        deleteReason === r ? "border-red-300 bg-red-50 text-red-700 font-medium" : "border-gray-200 hover:bg-gray-50"
                      }`}>
                      {r}
                    </button>
                  ))}
                  <input type="text" placeholder="Ou saisir un motif personnalisé..."
                    value={["Violation des conditions d'utilisation","Contenu inapproprié répété","Demande de l'utilisateur","Compte inactif > 1 an","Autre"].includes(deleteReason) ? "" : deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 mt-1" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteStep(1)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">← Retour</button>
                  <button onClick={() => setDeleteStep(3)} disabled={!deleteReason.trim()}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40">
                    Continuer →
                  </button>
                </div>
              </>
            )}

            {/* Étape 3 — Confirmation finale */}
            {deleteStep === 3 && (
              <>
                <h2 className="font-bold text-gray-900 mb-2">Confirmation finale</h2>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <p className="text-sm text-red-800 font-medium mb-2">Tu es sur le point de supprimer :</p>
                  <div className="text-sm text-red-700">
                    <div><strong>Compte :</strong> {deleteTarget.anonymousAlias || deleteTarget.email}</div>
                    <div><strong>Motif :</strong> {deleteReason}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-5">
                  Le compte sera désactivé immédiatement. L&apos;utilisateur ne pourra plus se connecter.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">← Retour</button>
                  <button onClick={confirmDelete} disabled={deleting}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {deleting ? "Suppression..." : "Confirmer la suppression"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50 max-w-xs">
          {toast}
        </div>
      )}
    </AuthGuard>
  );
}