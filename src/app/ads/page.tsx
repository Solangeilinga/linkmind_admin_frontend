"use client";
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import AuthGuard from "@/components/AuthGuard";
import { api, getAdmin } from "@/lib/api";

interface Ad {
  _id: string; title: string; description?: string;
  emoji?: string; ctaLabel?: string; ctaUrl?: string;
  category: string; placement: string[];
  advertiser?: string; impressions: number; clicks: number;
  isActive: boolean; startsAt?: string; endsAt?: string;
}

interface Stats { total: number; active: number; impressions: number; clicks: number; }

const CATEGORIES  = ["prevention","wellness","local_product","event","service"];
const CAT_LABELS: Record<string,string> = { prevention:"Prévention", wellness:"Bien-être", local_product:"Produit local", event:"Événement", service:"Service" };
const PLACEMENTS  = ["community_feed","mood_screen","challenges_screen"];
const PLACE_LABELS: Record<string,string> = { community_feed:"Fil communauté", mood_screen:"Écran humeur", challenges_screen:"Défis" };

const EMPTY = { title:"", description:"", emoji:"🌿", ctaLabel:"En savoir plus", ctaUrl:"", category:"wellness", placement:[] as string[], advertiser:"", isActive:true };

export default function AdsPage() {
  const admin        = getAdmin();
  const isSuperAdmin = admin?.role === "super_admin";

  const [items,   setItems]   = useState<Ad[]>([]);
  const [stats,   setStats]   = useState<Stats|null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<""|"true"|"false">("");
  const [toast,   setToast]   = useState("");
  const [modal,   setModal]   = useState<"create"|"edit"|null>(null);
  const [editing, setEditing] = useState<any>({...EMPTY});
  const [saving,  setSaving]  = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit:"50" });
      if (filter) params.set("active", filter);
      const [adsRes, statsRes] = await Promise.all([
        api.get<any>(`/api/ads?${params}`),
        api.get<Stats>("/api/ads/stats"),
      ]);
      setItems(adsRes.data);
      setStats(statsRes);
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setLoading(false); }
  },[filter]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const openCreate = () => { setEditing({...EMPTY, placement:[]}); setModal("create"); };
  const openEdit   = (a: Ad) => { setEditing({...a}); setModal("edit"); };

  const togglePlacement = (p: string) => {
    setEditing((prev:any) => ({
      ...prev,
      placement: prev.placement.includes(p)
        ? prev.placement.filter((x:string)=>x!==p)
        : [...prev.placement, p],
    }));
  };

  const save = async () => {
    if (!editing.title) return showToast("⚠️ Titre requis");
    if (!editing.placement.length) return showToast("⚠️ Sélectionne au moins un emplacement");
    setSaving(true);
    try {
      if (modal==="create") {
        await api.post("/api/ads", editing);
        showToast("✅ Annonce créée");
      } else {
        await api.patch(`/api/ads/${editing._id}`, editing);
        showToast("✅ Annonce modifiée");
      }
      setModal(null); fetchData();
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setSaving(false); }
  };

  const toggle = async (a: Ad) => {
    try {
      await api.patch(`/api/ads/${a._id}/toggle`, {});
      showToast(`✅ ${a.isActive?"Désactivée":"Activée"}`); fetchData();
    } catch(e:any) { showToast("❌ "+e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try { await api.delete(`/api/ads/${id}`); showToast("✅ Supprimée"); fetchData(); }
    catch(e:any) { showToast("❌ "+e.message); }
  };

  return (
    <AuthGuard>
      <AdminLayout>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Annonces & Publicités</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gestion des annonces affichées dans l&apos;app</p>
            </div>
            {isSuperAdmin && (
              <button onClick={openCreate} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
                + Nouvelle annonce
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label:"Total annonces",  value:stats.total,                           icon:"📢", color:"bg-indigo-50 text-indigo-600" },
                { label:"Actives",         value:stats.active,                          icon:"✅", color:"bg-green-50 text-green-600"  },
                { label:"Impressions",     value:stats.impressions.toLocaleString(),    icon:"👁",  color:"bg-blue-50 text-blue-600"    },
                { label:"Clics",           value:stats.clicks.toLocaleString(),         icon:"🖱️", color:"bg-amber-50 text-amber-600"  },
              ].map(s=>(
                <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${s.color}`}>{s.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg leading-none">{s.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filtres */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {([["","Toutes"],["true","Actives"],["false","Inactives"]] as [string,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter===v?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Liste */}
          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-24"/>
            ))}</div>
          ) : items.length===0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">📢</div>
              <div className="font-semibold text-gray-900">Aucune annonce</div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(ad=>(
                <div key={ad._id} className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition ${ad.isActive?"border-gray-100":"border-gray-100 opacity-60"}`}>
                  <div className="flex items-start gap-5">
                    {/* Emoji */}
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                      {ad.emoji||"📢"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900">{ad.title}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ad.isActive?"bg-green-50 text-green-600":"bg-gray-50 text-gray-400"}`}>
                          {ad.isActive?"Actif":"Inactif"}
                        </span>
                        <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{CAT_LABELS[ad.category]||ad.category}</span>
                      </div>
                      {ad.description && <p className="text-sm text-gray-500 mb-2">{ad.description}</p>}
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        {ad.advertiser && <span>🏢 {ad.advertiser}</span>}
                        {ad.placement.map(p=><span key={p} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{PLACE_LABELS[p]||p}</span>)}
                        <span>👁 {ad.impressions.toLocaleString()} impressions</span>
                        <span>🖱️ {ad.clicks.toLocaleString()} clics</span>
                        {ad.impressions>0 && <span className="text-gray-500">CTR: {((ad.clicks/ad.impressions)*100).toFixed(1)}%</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>toggle(ad)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl transition ${ad.isActive?"bg-gray-50 text-gray-600 hover:bg-gray-100":"bg-green-50 text-green-600 hover:bg-green-100"}`}>
                        {ad.isActive?"Désactiver":"Activer"}
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button onClick={()=>openEdit(ad)} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition">
                            Modifier
                          </button>
                          <button onClick={()=>remove(ad._id)} className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition">
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-5">{modal==="create"?"Nouvelle annonce":"Modifier l'annonce"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Titre * (60 car. max)</label>
                  <input maxLength={60} value={editing.title||""} onChange={e=>setEditing((p:any)=>({...p,title:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Emoji</label>
                  <input value={editing.emoji||"🌿"} onChange={e=>setEditing((p:any)=>({...p,emoji:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description (120 car. max)</label>
                <textarea maxLength={120} rows={2} value={editing.description||""} onChange={e=>setEditing((p:any)=>({...p,description:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
                  <select value={editing.category||"wellness"} onChange={e=>setEditing((p:any)=>({...p,category:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {CATEGORIES.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Annonceur</label>
                  <input value={editing.advertiser||""} onChange={e=>setEditing((p:any)=>({...p,advertiser:e.target.value}))}
                    placeholder="Nom de la marque" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Emplacements * (sélectionne au moins un)</label>
                <div className="flex flex-wrap gap-2">
                  {PLACEMENTS.map(p=>(
                    <button key={p} type="button" onClick={()=>togglePlacement(p)}
                      className={`text-xs font-semibold px-3 py-2 rounded-xl transition border ${editing.placement?.includes(p)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                      {PLACE_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Texte bouton CTA</label>
                  <input value={editing.ctaLabel||"En savoir plus"} onChange={e=>setEditing((p:any)=>({...p,ctaLabel:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL CTA</label>
                  <input type="url" value={editing.ctaUrl||""} onChange={e=>setEditing((p:any)=>({...p,ctaUrl:e.target.value}))}
                    placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!editing.isActive} onChange={e=>setEditing((p:any)=>({...p,isActive:e.target.checked}))} className="rounded"/>
                <span className="text-sm text-gray-700">Activer immédiatement</span>
              </label>
              {/* Ciblage */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Ciblage & planification</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début</label>
                    <input type="date" value={editing.startsAt ? editing.startsAt.slice(0,10) : ""} onChange={e=>setEditing((p:any)=>({...p,startsAt:e.target.value||undefined}))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin</label>
                    <input type="date" value={editing.endsAt ? editing.endsAt.slice(0,10) : ""} onChange={e=>setEditing((p:any)=>({...p,endsAt:e.target.value||undefined}))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Âge min</label>
                    <input type="number" min="0" max="120" value={editing.targetAgeMin||""} onChange={e=>setEditing((p:any)=>({...p,targetAgeMin:e.target.value?Number(e.target.value):undefined}))}
                      placeholder="18" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Âge max</label>
                    <input type="number" min="0" max="120" value={editing.targetAgeMax||""} onChange={e=>setEditing((p:any)=>({...p,targetAgeMax:e.target.value?Number(e.target.value):undefined}))}
                      placeholder="65" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ville cible</label>
                    <input value={editing.targetCity||""} onChange={e=>setEditing((p:any)=>({...p,targetCity:e.target.value}))}
                      placeholder="Dakar" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL de l&apos;image</label>
                  <input type="url" value={editing.imageUrl||""} onChange={e=>setEditing((p:any)=>({...p,imageUrl:e.target.value}))}
                    placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                {saving?"Enregistrement...":modal==="create"?"Créer":"Modifier"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50">{toast}</div>}
    </AdminLayout>
    </AuthGuard>
  );
}