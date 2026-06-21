"use client";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import { getAdmin, api, saveSession } from "@/lib/api";

export default function SettingsPage() {
  const admin = getAdmin();
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"ok"|"err">("ok");

  // Profil
  const [name, setName] = useState(admin?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Mot de passe
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd]   = useState(false);

  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3500);
  };

  const saveProfile = async () => {
    if (!name.trim()) return showToast("⚠️ Le nom ne peut pas être vide", "err");
    setSavingProfile(true);
    try {
      const res = await api.patch<{ admin: any }>("/api/auth/profile", { name: name.trim() });
      // Mettre à jour le localStorage
      const current = getAdmin();
      saveSession(localStorage.getItem("adminToken")!, { ...current, name: res.admin.name });
      showToast("✅ Profil mis à jour");
    } catch (e: any) {
      showToast("❌ " + e.message, "err");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd)
      return showToast("⚠️ Tous les champs sont requis", "err");
    if (newPwd !== confirmPwd)
      return showToast("⚠️ Les mots de passe ne correspondent pas", "err");
    if (newPwd.length < 8)
      return showToast("⚠️ Le mot de passe doit faire au moins 8 caractères", "err");
    setSavingPwd(true);
    try {
      await api.patch("/api/auth/password", { currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showToast("✅ Mot de passe mis à jour");
    } catch (e: any) {
      showToast("❌ " + e.message, "err");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <AuthGuard>
      <AdminLayout>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configuration de votre compte administrateur</p>
          </div>

          <div className="max-w-2xl space-y-6">
            {/* Profil admin */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Profil administrateur</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                  {name?.[0]?.toUpperCase() || admin?.email?.[0]?.toUpperCase() || "A"}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{name || "Administrateur"}</div>
                  <div className="text-sm text-gray-500">{admin?.email}</div>
                  <span className="inline-block mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full capitalize">
                    {admin?.role || "analyst"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    defaultValue={admin?.email || ""}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition"
              >
                {savingProfile ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Sécurité</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={changePassword}
                  disabled={savingPwd}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-xl transition"
                >
                  {savingPwd ? "Modification..." : "Changer le mot de passe"}
                </button>
              </div>
            </div>

            {/* Informations système */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Informations système</h2>
              <dl className="space-y-3">
                {[
                  { label: "Version admin",    value: "1.1.0" },
                  { label: "Backend API",       value: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000" },
                  { label: "Environnement",     value: process.env.NODE_ENV || "development" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <dt className="text-sm text-gray-500">{row.label}</dt>
                    <dd className="text-sm font-medium text-gray-900 font-mono">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm shadow-xl z-50 text-white ${toastType === "err" ? "bg-red-600" : "bg-gray-900"}`}>
          {toast}
        </div>
      )}
    </AuthGuard>
  );
}