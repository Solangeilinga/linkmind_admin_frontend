"use client";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";

// ── Catégories prédéfinies ────────────────────────────────────────────────────
const STRESS_CATEGORIES = ["academic", "social", "health", "financial", "personal", "other"];
const STRESS_CAT_LABELS: Record<string, string> = {
  academic: "Académique", social: "Social", health: "Santé",
  financial: "Financier", personal: "Personnel", other: "Autre",
};

const MSG_CATEGORIES = ["wellbeing", "motivation", "gratitude", "courage", "other"];
const MSG_CAT_LABELS: Record<string, string> = {
  wellbeing: "Bien-être", motivation: "Motivation", gratitude: "Gratitude",
  courage: "Courage", other: "Autre",
};

const MOOD_IDS = ["stressed", "anxious", "tired", "sad", "neutral", "good", "great"];
const MOOD_LABELS: Record<string, string> = {
  stressed: "Stressé(e)", anxious: "Anxieux(se)", tired: "Fatigué(e)",
  sad: "Triste", neutral: "Neutre", good: "Bien", great: "Super bien",
};

// Emojis auto selon le label (simple mapping pour ne pas surcharger l'admin)
const AUTO_EMOJI: Record<string, string> = {
  academic: "📚", social: "🤝", health: "🏥", financial: "💰", personal: "💭", other: "💬",
  wellbeing: "🌱", motivation: "💪", gratitude: "🙏", courage: "⚡",
  stressed: "😰", anxious: "😟", tired: "😔", sad: "😢", neutral: "😐", good: "🙂", great: "😄",
};

// Couleurs auto selon humeur
const AUTO_COLOR: Record<string, string> = {
  stressed: "#C93B2B", anxious: "#E07B2A", tired: "#8A7070",
  sad: "#6B7280", neutral: "#F5B731", good: "#27AE60", great: "#2ECC71",
};

// ── Onglets ───────────────────────────────────────────────────────────────────
type Tab = "stress-factors" | "daily-messages" | "wellness-tips" | "mood-definitions" |
           "professional-types" | "challenge-categories" | "challenge-difficulties" |
           "post-types" | "badges";

const TABS: { id: Tab; label: string; emoji: string; desc: string }[] = [
  { id: "stress-factors",         label: "Facteurs de stress",    emoji: "😰", desc: "Sélectionnables lors d'un enregistrement d'humeur" },
  { id: "daily-messages",         label: "Messages du jour",       emoji: "🌱", desc: "Affichés aléatoirement chaque jour" },
  { id: "wellness-tips",          label: "Conseils bien-être",     emoji: "💡", desc: "Affichés selon l'humeur" },
  { id: "mood-definitions",       label: "Humeurs",                emoji: "😊", desc: "Labels et emojis des niveaux d'humeur" },
  { id: "professional-types",     label: "Types de pros",          emoji: "🩺", desc: "Catégories de professionnels" },
  { id: "challenge-categories",   label: "Catégories défis",       emoji: "🏆", desc: "Catégories pour organiser les défis" },
  { id: "challenge-difficulties", label: "Niveaux difficulté",     emoji: "⚡", desc: "Facile / Moyen / Difficile" },
  { id: "post-types",             label: "Types de posts",         emoji: "💬", desc: "Catégories de posts communauté" },
  { id: "badges",                 label: "Badges",                 emoji: "🎖️", desc: "Récompenses utilisateurs" },
];

// ── Champs par onglet (simplifié — emojis/couleurs auto ou masqués) ─────────
type Field = { key: string; label: string; type: "text" | "textarea" | "number" | "boolean" | "select" | "combobox"; options?: { value: string; label: string }[]; auto?: boolean; placeholder?: string };

const FIELDS: Record<Tab, Field[]> = {
  "stress-factors": [
    { key: "label",    label: "Nom du facteur",  type: "text",     placeholder: "Ex: Examens" },
    { key: "category", label: "Catégorie",       type: "combobox", options: STRESS_CATEGORIES.map(c => ({ value: c, label: STRESS_CAT_LABELS[c] })) },
    { key: "order",    label: "Ordre d'affichage", type: "number", placeholder: "1" },
    { key: "isActive", label: "Actif",            type: "boolean" },
  ],
  "daily-messages": [
    { key: "text",     label: "Message",          type: "textarea", placeholder: "Ex: Prends soin de toi aujourd'hui." },
    { key: "category", label: "Catégorie",        type: "combobox", options: MSG_CATEGORIES.map(c => ({ value: c, label: MSG_CAT_LABELS[c] })) },
    { key: "isActive", label: "Actif",            type: "boolean" },
  ],
  "wellness-tips": [
    { key: "moodId",      label: "Pour quelle humeur ?", type: "select", options: MOOD_IDS.map(m => ({ value: m, label: MOOD_LABELS[m] })) },
    { key: "title",       label: "Titre du conseil",     type: "text",   placeholder: "Ex: Respiration 4-7-8" },
    { key: "description", label: "Description courte",   type: "textarea", placeholder: "Ex: Expire le stress en 3 minutes" },
    { key: "actionPath",  label: "Lien dans l'app",      type: "select", options: [
      { value: "",              label: "Aucun lien" },
      { value: "/challenges",   label: "Page Défis" },
      { value: "/community",    label: "Page Communauté" },
      { value: "/professionals",label: "Page Professionnels" },
    ]},
    { key: "order",       label: "Ordre",                type: "number", placeholder: "1" },
    { key: "isActive",    label: "Actif",                type: "boolean" },
  ],
  "mood-definitions": [
    { key: "id",    label: "Identifiant (ne pas modifier)", type: "text" },
    { key: "label", label: "Label affiché",                 type: "text", placeholder: "Ex: Super bien" },
    { key: "score", label: "Score (1=bas, 5=haut)",         type: "number" },
    { key: "order", label: "Ordre",                          type: "number" },
    { key: "isActive", label: "Actif",                      type: "boolean" },
  ],
  "professional-types": [
    { key: "id",          label: "Identifiant",     type: "text",   placeholder: "Ex: psychologist" },
    { key: "label",       label: "Nom singulier",   type: "text",   placeholder: "Ex: Psychologue" },
    { key: "labelPlural", label: "Nom pluriel",     type: "text",   placeholder: "Ex: Psychologues" },
    { key: "order",       label: "Ordre",           type: "number" },
    { key: "isActive",    label: "Actif",           type: "boolean" },
  ],
  "challenge-categories": [
    { key: "id",          label: "Identifiant",     type: "text",   placeholder: "Ex: breathing" },
    { key: "label",       label: "Nom singulier",   type: "text",   placeholder: "Ex: Respiration" },
    { key: "labelPlural", label: "Nom pluriel",     type: "text",   placeholder: "Ex: Respirations" },
    { key: "order",       label: "Ordre",           type: "number" },
    { key: "isActive",    label: "Actif",           type: "boolean" },
  ],
  "challenge-difficulties": [
    { key: "id",               label: "Identifiant",            type: "text",   placeholder: "Ex: easy" },
    { key: "label",            label: "Label",                  type: "text",   placeholder: "Ex: Facile" },
    { key: "pointsMultiplier", label: "Multiplicateur de points", type: "number", placeholder: "1.5" },
    { key: "order",            label: "Ordre",                  type: "number" },
    { key: "isActive",         label: "Actif",                  type: "boolean" },
  ],
  "post-types": [
    { key: "id",      label: "Identifiant", type: "text",   placeholder: "Ex: general" },
    { key: "label",   label: "Label",       type: "text",   placeholder: "Ex: Général" },
    { key: "order",   label: "Ordre",       type: "number" },
    { key: "isActive",label: "Actif",       type: "boolean" },
  ],
  "badges": [
    { key: "id",          label: "Identifiant",         type: "text",     placeholder: "Ex: first_mood" },
    { key: "name",        label: "Nom du badge",        type: "text",     placeholder: "Ex: Premier pas" },
    { key: "description", label: "Description",         type: "text",     placeholder: "Ex: Enregistre ton humeur pour la première fois" },
    { key: "order",       label: "Ordre",               type: "number" },
    { key: "isActive",    label: "Actif",               type: "boolean" },
  ],
};

// ── Valeurs par défaut ────────────────────────────────────────────────────────
function defaultForm(tab: Tab): Record<string, any> {
  const d: Record<string, any> = { isActive: true, order: 1 };
  if (tab === "wellness-tips") d.actionPath = "";
  if (tab === "challenge-difficulties") d.pointsMultiplier = 1;
  return d;
}

// ── Enrichissement auto (emoji, couleur) avant envoi ─────────────────────────
function enrichBeforeSave(tab: Tab, form: Record<string, any>): Record<string, any> {
  const data = { ...form };
  // Générer emoji auto si absent
  if (!data.emoji || data.emoji === "") {
    const key = data.category || data.moodId || data.id;
    if (key && AUTO_EMOJI[key]) data.emoji = AUTO_EMOJI[key];
    else if (tab === "stress-factors")     data.emoji = "💭";
    else if (tab === "daily-messages")     data.emoji = "🌱";
    else if (tab === "wellness-tips")      data.emoji = "💡";
    else if (tab === "professional-types") data.emoji = "🩺";
    else if (tab === "challenge-categories") data.emoji = "🏆";
    else if (tab === "post-types")         data.emoji = "💬";
    else if (tab === "badges")             data.icon = data.icon || "🎖️";
  }
  // Générer couleur auto si absente
  if (!data.colorHex || data.colorHex === "") {
    const key = data.moodId || data.id;
    if (key && AUTO_COLOR[key])             data.colorHex = AUTO_COLOR[key];
    else if (tab === "professional-types")  data.colorHex = "#77021D";
    else if (tab === "challenge-categories")data.colorHex = "#3498DB";
    else if (tab === "challenge-difficulties") data.colorHex = "#27AE60";
    else if (tab === "post-types")          data.colorHex = "#77021D";
    else if (tab === "mood-definitions")    data.colorHex = "#F5B731";
  }
  // Générer id auto depuis label si absent
  if (!data.id && data.label) {
    data.id = data.label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
  }
  return data;
}

// ── Affichage résumé d'un item ────────────────────────────────────────────────
function getPrimary(tab: Tab, item: any) {
  if (tab === "daily-messages") return item.text?.substring(0, 60) + (item.text?.length > 60 ? "…" : "");
  if (tab === "wellness-tips")  return item.title;
  if (tab === "badges")         return item.name;
  return item.label || item.name || item.id || "—";
}
function getSecondary(tab: Tab, item: any) {
  if (tab === "stress-factors")  return STRESS_CAT_LABELS[item.category] || item.category;
  if (tab === "daily-messages")  return MSG_CAT_LABELS[item.category]    || item.category;
  if (tab === "wellness-tips")   return `${MOOD_LABELS[item.moodId] || item.moodId}`;
  if (tab === "challenge-difficulties") return `×${item.pointsMultiplier} pts`;
  return item.id || "";
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function DatabasePage() {
  const [tab, setTab]       = useState<Tab>("stress-factors");
  const [items, setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<{ mode: "create"|"edit"; data: any }|null>(null);
  const [form, setForm]     = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast]   = useState("");
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [comboOpen, setComboOpen] = useState<string|null>(null);
  const [comboSearch, setComboSearch] = useState<Record<string, string>>({});

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const d = await api.get<any[]>(`/api/seed/${tab}`); setItems(d); }
    catch (e: any) { showToast("❌ " + e.message); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => { setForm(defaultForm(tab)); setModal({ mode: "create", data: {} }); };
  const openEdit   = (item: any) => { setForm({ ...item }); setModal({ mode: "edit", data: item }); };

  const save = async () => {
    setSaving(true);
    try {
      const enriched = enrichBeforeSave(tab, form);
      if (modal?.mode === "create") {
        await api.post(`/api/seed/${tab}`, enriched);
        showToast("✅ Créé avec succès");
      } else {
        await api.put(`/api/seed/${tab}/${modal?.data._id}`, enriched);
        showToast("✅ Mis à jour");
      }
      setModal(null);
      fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/seed/${tab}/${id}`);
      showToast("✅ Supprimé"); setDeleteId(null); fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
  };

  const seedAll = async () => {
    setSeeding(true);
    try {
      const r = await api.post<any>("/api/seed/seed", {});
      const added = Object.entries(r.results).filter(([,v]) => (v as number) > 0).map(([k,v]) => `${k}: ${v}`).join(", ");
      showToast(added ? `✅ ${added}` : "ℹ️ Données déjà en place");
      fetchItems();
    } catch (e: any) { showToast("❌ " + e.message); }
    finally { setSeeding(false); }
  };

  const tabInfo = TABS.find(t => t.id === tab)!;
  const fields  = FIELDS[tab];

  // ── Rendu d'un champ du formulaire ─────────────────────────────────────────
  const renderField = (f: Field) => {
    const val = form[f.key];

    if (f.type === "boolean") return (
      <div key={f.key} className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-gray-700">{f.label}</span>
        <button type="button"
          onClick={() => setForm(p => ({ ...p, [f.key]: !p[f.key] }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${val ? "bg-[#77021D]" : "bg-gray-200"}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    );

    if (f.type === "select") return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <select value={val || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20 bg-white">
          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );

    // Combobox = dropdown + saisie libre
    if (f.type === "combobox") {
      const search = comboSearch[f.key] || "";
      const filtered = (f.options || []).filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      );
      const currentLabel = f.options?.find(o => o.value === val)?.label || val || "";

      return (
        <div key={f.key} className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
          <div className="relative">
            <input
              type="text"
              value={comboOpen === f.key ? search : currentLabel}
              placeholder={f.placeholder || "Sélectionner ou saisir..."}
              onFocus={() => { setComboOpen(f.key); setComboSearch(p => ({ ...p, [f.key]: "" })); }}
              onChange={e => {
                setComboSearch(p => ({ ...p, [f.key]: e.target.value }));
                // Si valeur libre saisie, on la stocke directement
                setForm(p => ({ ...p, [f.key]: e.target.value }));
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
          </div>
          {comboOpen === f.key && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filtered.length > 0 ? filtered.map(o => (
                <button key={o.value} type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => {
                    setForm(p => ({ ...p, [f.key]: o.value }));
                    setComboSearch(p => ({ ...p, [f.key]: "" }));
                    setComboOpen(null);
                  }}
                >
                  <span className="text-gray-400 text-xs">{o.value}</span>
                  <span className="font-medium">{o.label}</span>
                </button>
              )) : (
                <div className="px-4 py-2.5 text-sm text-gray-400">
                  Valeur libre : <strong>{search}</strong> — appuie sur Entrée pour valider
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (f.type === "textarea") return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <textarea value={val || ""} rows={3} placeholder={f.placeholder}
          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20 resize-none" />
      </div>
    );

    return (
      <div key={f.key}>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
        <input type={f.type === "number" ? "number" : "text"} value={val ?? ""} placeholder={f.placeholder}
          onChange={e => setForm(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#77021D]/20" />
      </div>
    );
  };

  return (
    <AdminLayout>
        <div onClick={() => comboOpen && setComboOpen(null)}>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Base de données contenu</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gérez le contenu affiché dans l&apos;application</p>
            </div>
            <button onClick={seedAll} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] transition disabled:opacity-50">
              {seeding ? "⏳ En cours..." : "🌱 Seed initial"}
            </button>
          </div>

          {/* Info */}
          <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800 flex gap-2.5">
            <span className="flex-shrink-0 mt-0.5">💡</span>
            <div>
              <strong>Automatique :</strong> Les emojis et couleurs sont générés automatiquement selon la catégorie.
              Le <strong>Seed initial</strong> pré-remplit les données par défaut si les collections sont vides.
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap mb-5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                  tab === t.id ? "bg-[#77021D] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                <span>{t.emoji}</span><span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{tabInfo.emoji} {tabInfo.label}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{tabInfo.desc} · <strong>{items.length}</strong> entrée{items.length > 1 ? "s" : ""}</p>
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#77021D] text-white rounded-xl text-sm font-semibold hover:bg-[#5a0116] transition">
                + Ajouter
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array(4).fill(0).map((_,i) => (
                  <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1"><div className="h-4 bg-gray-100 rounded w-48 mb-1.5" /><div className="h-3 bg-gray-100 rounded w-32" /></div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="text-4xl mb-3">{tabInfo.emoji}</div>
                <div className="font-semibold text-gray-700">Aucune entrée</div>
                <div className="text-sm text-gray-400 mt-1">Clique sur <strong>Seed initial</strong> pour démarrer.</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map(item => (
                  <div key={item._id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition group">
                    <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 rounded-xl flex-shrink-0">
                      {item.emoji || item.icon || tabInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{getPrimary(tab, item)}</span>
                        {item.colorHex && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.colorHex }} />}
                        {!item.isActive && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactif</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{getSecondary(tab, item)}</div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(item)}
                        className="px-3 py-1.5 text-xs font-medium text-[#77021D] bg-red-50 rounded-lg hover:bg-red-100 transition">
                        Modifier
                      </button>
                      <button onClick={() => setDeleteId(item._id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>{/* end outer onClick div */}

      {/* Modal créer/modifier */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-4">
              {modal.mode === "create" ? `Ajouter — ${tabInfo.label}` : `Modifier`}
            </h2>
            <div className="space-y-4">
              {fields.map(renderField)}
            </div>
            <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
              Les emojis et couleurs sont générés automatiquement.
            </p>
            <div className="flex gap-3 mt-4">
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
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={() => remove(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Supprimer</button>
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
  );
}