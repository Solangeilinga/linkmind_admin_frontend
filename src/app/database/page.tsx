"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "stress-factors" | "daily-messages" | "wellness-tips" | "mood-definitions" |
           "professional-types" | "challenge-categories" | "challenge-difficulties" |
           "post-types" | "badges";

const TABS: { id: Tab; label: string; emoji: string; desc: string }[] = [
  { id: "stress-factors",          label: "Facteurs de stress",    emoji: "😰", desc: "Facteurs sélectionnables lors d'un enregistrement d'humeur" },
  { id: "daily-messages",          label: "Messages du jour",      emoji: "🌱", desc: "Messages inspirants affichés aléatoirement chaque jour" },
  { id: "wellness-tips",           label: "Conseils bien-être",    emoji: "💡", desc: "Conseils affichés selon l'humeur de l'utilisateur" },
  { id: "mood-definitions",        label: "Définitions d'humeur",  emoji: "😊", desc: "Émojis et labels des niveaux d'humeur" },
  { id: "professional-types",      label: "Types de pros",         emoji: "🩺", desc: "Catégories de professionnels disponibles" },
  { id: "challenge-categories",    label: "Catégories de défis",   emoji: "🏆", desc: "Catégories pour organiser les défis" },
  { id: "challenge-difficulties",  label: "Niveaux de difficulté", emoji: "⚡", desc: "Niveaux de difficulté des défis" },
  { id: "post-types",              label: "Types de posts",        emoji: "💬", desc: "Catégories de posts dans la communauté" },
  { id: "badges",                  label: "Badges",                emoji: "🎖️", desc: "Récompenses débloquées par les utilisateurs" },
];

// Champs à afficher et éditer par collection
const FIELDS: Record<Tab, { key: string; label: string; type: string; options?: string[] }[]> = {
  "stress-factors": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "category", label: "Catégorie", type: "select", options: ["academic","social","health","financial","personal","other"] },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "daily-messages": [
    { key: "text", label: "Message", type: "textarea" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "category", label: "Catégorie", type: "select", options: ["motivation","wellbeing","gratitude","courage"] },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "wellness-tips": [
    { key: "moodId", label: "Humeur cible", type: "select", options: ["stressed","anxious","tired","sad","neutral","good","great"] },
    { key: "title", label: "Titre", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "actionPath", label: "Lien Flutter (ex: /challenges)", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "mood-definitions": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "score", label: "Score (1-5)", type: "number" },
    { key: "colorHex", label: "Couleur hex", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "professional-types": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "labelPlural", label: "Label pluriel", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "colorHex", label: "Couleur hex", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "challenge-categories": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "labelPlural", label: "Label pluriel", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "colorHex", label: "Couleur hex", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "challenge-difficulties": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "colorHex", label: "Couleur hex", type: "text" },
    { key: "pointsMultiplier", label: "Multiplicateur de points", type: "number" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "post-types": [
    { key: "id", label: "ID", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "colorHex", label: "Couleur hex", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
  "badges": [
    { key: "id", label: "ID", type: "text" },
    { key: "name", label: "Nom", type: "text" },
    { key: "icon", label: "Icône", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "order", label: "Ordre", type: "number" },
    { key: "isActive", label: "Actif", type: "boolean" },
  ],
};

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<Tab>("stress-factors");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data: any } | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(`/api/seed/${activeTab}`);
      setItems(data);
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    const defaults: any = {};
    FIELDS[activeTab].forEach(f => {
      if (f.type === "boolean") defaults[f.key] = true;
      else if (f.type === "number") defaults[f.key] = 0;
      else defaults[f.key] = "";
    });
    setForm(defaults);
    setModal({ mode: "create", data: {} });
  };

  const openEdit = (item: any) => {
    setForm({ ...item });
    setModal({ mode: "edit", data: item });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal?.mode === "create") {
        await api.post(`/api/seed/${activeTab}`, form);
        showToast("✅ Créé avec succès");
      } else {
        await api.put(`/api/seed/${activeTab}/${modal?.data._id}`, form);
        showToast("✅ Mis à jour");
      }
      setModal(null);
      fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/seed/${activeTab}/${id}`);
      showToast("✅ Supprimé");
      setDeleteId(null);
      fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
  };

  const seedAll = async () => {
    setSeeding(true);
    try {
      const result = await api.post<any>("/api/seed/seed", {});
      const added = Object.entries(result.results)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      showToast(added ? `✅ Seed : ${added}` : "ℹ️ Toutes les collections sont déjà remplies");
      fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setSeeding(false); }
  };

  const tab = TABS.find(t => t.id === activeTab)!;
  const fields = FIELDS[activeTab];

  const renderField = (f: typeof fields[0]) => {
    if (f.type === "boolean") return (
      <label key={f.key} className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setForm((p: any) => ({ ...p, [f.key]: !p[f.key] }))}
          className={`w-11 h-6 rounded-full transition-colors ${form[f.key] ? "bg-[#77021D]" : "bg-gray-200"} relative`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form[f.key] ? "translate-x-6" : "translate-x-1"}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">{f.label}</span>
      </label>
    );
    if (f.type === "select") return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <select
          value={form[f.key] || ""}
          onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/30"
        >
          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
    if (f.type === "textarea") return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <textarea
          value={form[f.key] || ""}
          onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/30 resize-none"
        />
      </div>
    );
    return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <input
          type={f.type === "number" ? "number" : "text"}
          value={form[f.key] ?? ""}
          onChange={e => setForm((p: any) => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/30"
        />
      </div>
    );
  };

  // Primary display field per tab
  const getPrimary = (item: any) => {
    if (activeTab === "daily-messages") return item.text;
    if (activeTab === "wellness-tips") return item.title;
    if (activeTab === "badges") return item.name;
    return item.label || item.name || item.text || item.id || "—";
  };

  const getSecondary = (item: any) => {
    if (activeTab === "wellness-tips") return `Humeur: ${item.moodId} · ${item.description || ""}`;
    if (activeTab === "badges") return item.description || "";
    if (activeTab === "daily-messages") return item.category;
    if (activeTab === "stress-factors") return item.category;
    if (activeTab === "challenge-difficulties") return `×${item.pointsMultiplier} pts`;
    return item.id || "";
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Base de données contenu</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gérez le contenu affiché dans l'application LinkMind
              </p>
            </div>
            <button
              onClick={seedAll}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] transition disabled:opacity-50"
            >
              {seeding ? "⏳ En cours..." : "🌱 Seed initial"}
            </button>
          </div>

          {/* Info banner */}
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-2.5">
            <span className="text-base flex-shrink-0">⚠️</span>
            <div>
              <strong>Seed initial :</strong> Si la base est vide, clique sur "Seed initial" pour pré-remplir toutes les collections avec les données par défaut.
              Ensuite tu peux modifier chaque entrée librement.
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  activeTab === t.id
                    ? "bg-[#77021D] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Active tab content */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Tab header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{tab.emoji} {tab.label}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{tab.desc} · <span className="font-medium">{items.length} entrée{items.length > 1 ? "s" : ""}</span></p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] transition"
              >
                + Ajouter
              </button>
            </div>

            {/* Items list */}
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded w-48 mb-1.5" />
                      <div className="h-3 bg-gray-100 rounded w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="text-4xl mb-3">{tab.emoji}</div>
                <div className="font-semibold text-gray-700">Aucune entrée</div>
                <div className="text-sm text-gray-400 mt-1">Clique sur "Seed initial" ou "Ajouter" pour commencer.</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item._id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition group">
                    {/* Emoji */}
                    <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 rounded-xl flex-shrink-0">
                      {item.emoji || item.icon || "📝"}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{getPrimary(item)}</span>
                        {item.colorHex && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.colorHex }} />
                        )}
                        {!item.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactif</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{getSecondary(item)}</div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEdit(item)}
                        className="px-3 py-1.5 text-xs font-medium text-[#77021D] bg-red-50 rounded-lg hover:bg-red-100 transition"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleteId(item._id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal créer/éditer */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-4">
              {modal.mode === "create" ? `Ajouter — ${tab.label}` : `Modifier — ${getPrimary(modal.data)}`}
            </h2>
            <div className="space-y-4">
              {fields.map(renderField)}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-2">Supprimer cet élément ?</h2>
            <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => remove(deleteId)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50 animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </AuthGuard>
  );
}