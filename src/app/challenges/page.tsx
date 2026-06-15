"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api, getAdmin } from "@/lib/api";

interface Challenge {
  _id: string; title: string; description: string;
  category: string; difficulty: string; durationMinutes: number;
  points: number; icon: string; isPremium: boolean; isActive: boolean; order: number;
}

const CATEGORIES = ["mindfulness","breathing","gratitude","movement","social","reflection","sleep"];
const DIFFICULTIES = ["easy","medium","hard"];
const COMPLETION_TYPES = ["timer","action","reflection","social","exploration"];

const EMPTY: Partial<Challenge> & { completionType?: any } = {
  title:"", description:"", category:"mindfulness", difficulty:"easy",
  durationMinutes:5, points:10, icon:"🌱", isPremium:false, isActive:true,
  completionType:{ type:"action" },
};

export default function ChallengesPage() {
  const admin   = getAdmin();
  const isSuperAdmin = admin?.role === "super_admin";

  const [items,   setItems]   = useState<Challenge[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState("");
  const [modal,   setModal]   = useState<"create"|"edit"|null>(null);
  const [editing, setEditing] = useState<any>({ ...EMPTY });
  const [saving,  setSaving]  = useState(false);
  const [filterActive, setFilterActive] = useState<""|"true"|"false">("");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };

  const fetchData = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:String(p), limit:"20" });
      if (filterActive) params.set("active", filterActive);
      const res = await api.get<any>(`/api/challenges?${params}`);
      setItems(res.data); setTotal(res.pagination.total);
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setLoading(false); }
  },[filterActive]);

  useEffect(()=>{ setPage(1); },[filterActive]);
  useEffect(()=>{ fetchData(page); },[fetchData,page]);

  const openCreate = () => { setEditing({...EMPTY}); setModal("create"); };
  const openEdit   = (c: Challenge) => { setEditing({...c}); setModal("edit"); };

  const save = async () => {
    if (!editing.title || !editing.category) return showToast("⚠️ Titre et catégorie requis");
    setSaving(true);
    try {
      if (modal==="create") {
        await api.post("/api/challenges", editing);
        showToast("✅ Défi créé");
      } else {
        await api.patch(`/api/challenges/${editing._id}`, editing);
        showToast("✅ Défi modifié");
      }
      setModal(null); fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
    finally { setSaving(false); }
  };

  const toggle = async (c: Challenge) => {
    try {
      await api.patch(`/api/challenges/${c._id}/toggle`, {});
      showToast(`✅ Défi ${c.isActive?"désactivé":"activé"}`);
      fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce défi ?")) return;
    try {
      await api.delete(`/api/challenges/${id}`);
      showToast("✅ Défi supprimé"); fetchData(page);
    } catch(e:any) { showToast("❌ "+e.message); }
  };

  const diffColor: Record<string,string> = { easy:"text-green-600 bg-green-50", medium:"text-amber-600 bg-amber-50", hard:"text-red-600 bg-red-50" };
  const diffLabel: Record<string,string> = { easy:"Facile", medium:"Moyen", hard:"Difficile" };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Défis bien-être</h1>
              <p className="text-sm text-gray-500 mt-0.5">{total} défis au total</p>
            </div>
            {isSuperAdmin && (
              <button onClick={openCreate}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
                + Nouveau défi
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {([["","Tous"],["true","Actifs"],["false","Inactifs"]] as [string,string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setFilterActive(v as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filterActive===v?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_,i)=>(
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-40"/>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="font-semibold text-gray-900">Aucun défi</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map(c=>(
                <div key={c._id} className={`bg-white rounded-2xl border p-5 transition hover:shadow-md ${c.isActive?"border-gray-100":"border-gray-100 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{c.title}</div>
                        <div className="text-xs text-gray-400 capitalize">{c.category}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${c.isActive?"bg-green-50 text-green-600":"bg-gray-50 text-gray-400"}`}>
                      {c.isActive?"Actif":"Inactif"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffColor[c.difficulty]||"text-gray-500 bg-gray-50"}`}>
                      {diffLabel[c.difficulty]||c.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">⏱ {c.durationMinutes} min</span>
                    <span className="text-xs text-gray-500">⭐ {c.points} pts</span>
                    {c.isPremium && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">Premium</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>toggle(c)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${c.isActive?"bg-gray-50 hover:bg-gray-100 text-gray-600":"bg-green-50 hover:bg-green-100 text-green-600"}`}>
                      {c.isActive?"Désactiver":"Activer"}
                    </button>
                    {isSuperAdmin && (
                      <>
                        <button onClick={()=>openEdit(c)}
                          className="flex-1 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition">
                          Modifier
                        </button>
                        <button onClick={()=>remove(c._id)}
                          className="py-1.5 px-3 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal créer/modifier */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900 mb-5">{modal==="create"?"Nouveau défi":"Modifier le défi"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Titre *</label>
                  <input value={editing.title||""} onChange={e=>setEditing((p:any)=>({...p,title:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Icône</label>
                  <input value={editing.icon||""} onChange={e=>setEditing((p:any)=>({...p,icon:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label>
                <textarea rows={2} value={editing.description||""} onChange={e=>setEditing((p:any)=>({...p,description:e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
                  <select value={editing.category||"mindfulness"} onChange={e=>setEditing((p:any)=>({...p,category:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Difficulté</label>
                  <select value={editing.difficulty||"easy"} onChange={e=>setEditing((p:any)=>({...p,difficulty:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {DIFFICULTIES.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type complétion</label>
                  <select value={editing.completionType?.type||"action"} onChange={e=>setEditing((p:any)=>({...p,completionType:{...p.completionType,type:e.target.value}}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {COMPLETION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Durée (min)</label>
                  <input type="number" min="1" value={editing.durationMinutes||5} onChange={e=>setEditing((p:any)=>({...p,durationMinutes:Number(e.target.value)}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Points</label>
                  <input type="number" min="1" value={editing.points||10} onChange={e=>setEditing((p:any)=>({...p,points:Number(e.target.value)}))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!editing.isPremium} onChange={e=>setEditing((p:any)=>({...p,isPremium:e.target.checked}))}
                    className="rounded"/>
                  <span className="text-sm text-gray-700">Premium uniquement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isActive!==false} onChange={e=>setEditing((p:any)=>({...p,isActive:e.target.checked}))}
                    className="rounded"/>
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
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
    </AuthGuard>
  );
}
