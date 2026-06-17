"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api, getAdmin } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pro {
  _id: string; firstName: string; lastName: string;
  photo?: string; type: string; specialties?: string[];
  city?: string; phone?: string; email?: string;
  bio?: string; sessionPrice?: number; sessionDuration?: number;
  currency?: string; isActive: boolean; isVerified: boolean;
  isOnline: boolean; isInPerson: boolean;
  personalMeetingLink?: string; meetingProvider?: string;
  totalBookings?: number; rating?: number;
  availableSlots?: Slot[]; weeklyAvailability?: WeeklyAvail[];
}
interface Slot { _id: string; date: string; startTime: string; endTime: string; isBooked: boolean; }
interface WeeklyAvail { dayOfWeek: number; startTime: string; endTime: string; slotDuration: number; }

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPES = ["psychologist","coach","doctor"];
const TYPE_LABELS: Record<string,string> = { psychologist:"Psychologue", coach:"Coach de vie", doctor:"Médecin" };
const TYPE_ICONS:  Record<string,string> = { psychologist:"🧠", coach:"💪", doctor:"⚕️" };
const DAYS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const DURATIONS = [30,45,60,90,120];
const CURRENCIES = ["FCFA","EUR","USD","XOF"];

const EMPTY_PRO = {
  firstName:"", lastName:"", type:"psychologist", city:"", country:"Burkina Faso",
  address:"", phone:"", email:"", bio:"", sessionPrice:"", sessionDuration:"60", currency:"FCFA",
  specialties:"", languages:"", photo:"",
  isActive:true, isVerified:false,
  isOnline:false, isInPerson:true, personalMeetingLink:"",
  commissionRate:"0.10",
};
const EMPTY_SLOT   = { date:"", startTime:"09:00", endTime:"10:00" };
const EMPTY_WEEKLY = { dayOfWeek:1, startTime:"09:00", endTime:"17:00", slotDuration:60 };

function todayPlus(n=1) { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function fmtDate(iso: string) {
  try { const d=new Date(iso+"T12:00:00"); return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"}).format(d); }
  catch { return iso; }
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProfessionalsPage() {
  const router       = useRouter();
  const admin        = getAdmin();
  const isSuperAdmin = admin?.role === "super_admin";
  const isAdmin      = ["super_admin","admin"].includes(admin?.role);

  // Liste
  const [items,   setItems]   = useState<Pro[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<""|"verified"|"unverified"|"inactive">("");
  const [toast,   setToast]   = useState<{msg:string;ok:boolean}>({msg:"",ok:true});

  // Modal stepper
  const [modal,   setModal]   = useState<"create"|"edit"|null>(null);
  const [step,    setStep]    = useState(1); // 1=Infos, 2=Créneaux, 3=Confirmation
  const [editing, setEditing] = useState<any>({...EMPTY_PRO});
  const [saving,  setSaving]  = useState(false);
  const [newProId,setNewProId]= useState<string|null>(null);

  // Créneaux dans le stepper
  const [slots,    setSlots]    = useState<Slot[]>([]);
  const [newSlot,  setNewSlot]  = useState({...EMPTY_SLOT, date: todayPlus()});
  const [weekly,   setWeekly]   = useState<WeeklyAvail[]>([]);
  const [wForm,    setWForm]    = useState<WeeklyAvail>({...EMPTY_WEEKLY});
  const [slotTab,  setSlotTab]  = useState<"manual"|"weekly">("manual");

  // Détail pro
  const [detailPro, setDetailPro] = useState<Pro|null>(null);

  const showToast = (msg: string, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast({msg:"",ok:true}),3500); };

  // ── Fetch liste ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (p=1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:String(p), limit:"20" });
      if (search) params.set("search", search);
      if (filter==="verified")   params.set("verified","true");
      if (filter==="unverified") params.set("verified","false");
      if (filter==="inactive")   params.set("active","false");
      const res = await api.get<any>(`/api/professionals?${params}`);
      setItems(res.professionals ?? res.data ?? []);
      setTotal(res.total ?? res.pagination?.total ?? 0);
    } catch(e:any) { showToast("❌ "+e.message, false); }
    finally { setLoading(false); }
  },[search, filter]);

  useEffect(()=>{ setPage(1); },[search, filter]);
  useEffect(()=>{ fetchData(page); },[fetchData, page]);

  // ── Ouvrir création ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing({...EMPTY_PRO}); setStep(1); setSlots([]); setWeekly([]);
    setNewSlot({...EMPTY_SLOT, date:todayPlus()}); setWForm({...EMPTY_WEEKLY});
    setNewProId(null); setModal("create");
  };

  // ── Ouvrir édition ───────────────────────────────────────────────────────────
  const openEdit = (p: Pro) => {
    setEditing({
      ...p,
      specialties:     p.specialties?.join(", ") || "",
      languages:       (p as any).languages?.join(", ") || "",
      sessionPrice:    String(p.sessionPrice||""),
      sessionDuration: String(p.sessionDuration||60),
      commissionRate:  String((p as any).commissionRate||0.10),
    });
    setSlots(p.availableSlots || []);
    setWeekly(p.weeklyAvailability || []);
    setStep(1); setNewProId(p._id); setModal("edit");
  };

  // ── Sauvegarder infos (étape 1) ──────────────────────────────────────────────
  const saveInfo = async () => {
    if (!editing.firstName?.trim() || !editing.lastName?.trim())
      return showToast("⚠️ Prénom et nom requis", false);
    if (!editing.email?.trim())
      return showToast("⚠️ L'email est requis pour envoyer les notifications", false);
    setSaving(true);
    const payload = {
      ...editing,
      specialties:     editing.specialties ? editing.specialties.split(",").map((s:string)=>s.trim()).filter(Boolean) : [],
      languages:       editing.languages   ? editing.languages.split(",").map((s:string)=>s.trim()).filter(Boolean)   : [],
      sessionPrice:    editing.sessionPrice    ? Number(editing.sessionPrice)    : undefined,
      sessionDuration: editing.sessionDuration ? Number(editing.sessionDuration) : 60,
      commissionRate:  editing.commissionRate  ? Number(editing.commissionRate)  : 0.10,
    };
    try {
      if (modal==="create") {
        const res = await api.post<any>("/api/professionals", payload);
        const id = res.professional?._id || res._id || res.id;
        setNewProId(id);
        showToast("✅ Professionnel créé");
      } else {
        await api.patch(`/api/professionals/${editing._id}`, payload);
        setNewProId(editing._id);
        showToast("✅ Informations mises à jour");
      }
      setStep(2);
    } catch(e:any) { showToast("❌ "+e.message, false); }
    finally { setSaving(false); }
  };

  // ── Créneaux : ajouter manuel ─────────────────────────────────────────────────
  const addSlot = () => {
    const id = `${newSlot.date}_${newSlot.startTime}`;
    if (slots.some(s=>s._id===id)) return showToast("⚠️ Ce créneau existe déjà", false);
    if (!newSlot.date) return showToast("⚠️ Choisissez une date", false);
    setSlots(prev=>[...prev,{_id:id,date:newSlot.date,startTime:newSlot.startTime,endTime:newSlot.endTime,isBooked:false}].sort((a,b)=>a._id.localeCompare(b._id)));
  };
  const removeSlot = (id: string) => setSlots(prev=>prev.filter(s=>s._id!==id));

  // ── Créneaux : règles hebdo ──────────────────────────────────────────────────
  const addWeekly = () => {
    const exists = weekly.some(w=>w.dayOfWeek===wForm.dayOfWeek);
    setWeekly(prev=>exists ? prev.map(w=>w.dayOfWeek===wForm.dayOfWeek?wForm:w) : [...prev,wForm]);
    showToast("✅ Règle ajoutée");
  };
  const removeWeekly = (dow: number) => setWeekly(prev=>prev.filter(w=>w.dayOfWeek!==dow));

  // ── Générer créneaux depuis règles hebdo ──────────────────────────────────────
  const generateSlots = () => {
    if (!weekly.length) return showToast("⚠️ Ajoutez d'abord des règles hebdomadaires", false);
    const generated: Slot[] = [];
    const now = new Date();
    for (let d=1; d<=30; d++) {
      const day=new Date(now); day.setDate(day.getDate()+d);
      const dow=day.getDay();
      const rule=weekly.find(w=>w.dayOfWeek===dow);
      if (!rule) continue;
      const dateStr=day.toISOString().slice(0,10);
      const[sh,sm]=rule.startTime.split(":").map(Number);
      const[eh,em]=rule.endTime.split(":").map(Number);
      const dur=rule.slotDuration||60;
      let cur=sh*60+sm;
      while(cur+dur<=eh*60+em){
        const hh=String(Math.floor(cur/60)).padStart(2,"0");
        const mm=String(cur%60).padStart(2,"0");
        const eMin=cur+dur;
        const ehh=String(Math.floor(eMin/60)).padStart(2,"0");
        const emm=String(eMin%60).padStart(2,"0");
        generated.push({_id:`${dateStr}_${hh}:${mm}`,date:dateStr,startTime:`${hh}:${mm}`,endTime:`${ehh}:${emm}`,isBooked:false});
        cur+=dur;
      }
    }
    const booked=slots.filter(s=>s.isBooked);
    const genIds=new Set(generated.map(s=>s._id));
    const merged=[...booked.filter(s=>!genIds.has(s._id)),...generated].sort((a,b)=>a._id.localeCompare(b._id));
    setSlots(merged);
    showToast(`✅ ${generated.length} créneaux générés (30 jours)`);
  };

  // ── Sauvegarder créneaux (étape 2) ────────────────────────────────────────────
  const saveSlots = async () => {
    if (!newProId) return setStep(3);
    setSaving(true);
    try {
      await api.put(`/api/professionals/${newProId}/slots`, { slots, weeklyAvailability: weekly });
      showToast(`✅ ${slots.length} créneaux enregistrés`);
      setStep(3);
    } catch(e:any) { showToast("❌ "+e.message, false); }
    finally { setSaving(false); }
  };

  // ── Finaliser ─────────────────────────────────────────────────────────────────
  const finalize = () => {
    setModal(null); fetchData(page);
    showToast(modal==="create" ? "✅ Professionnel ajouté avec succès !" : "✅ Professionnel mis à jour !");
  };

  // ── Actions liste ─────────────────────────────────────────────────────────────
  const verify = async (p: Pro) => {
    try { await api.patch(`/api/professionals/${p._id}/verify`,{}); showToast("✅ Vérifié"); fetchData(page); }
    catch(e:any) { showToast("❌ "+e.message, false); }
  };
  const toggle = async (p: Pro) => {
    try { await api.patch(`/api/professionals/${p._id}/toggle`,{}); showToast(`✅ ${p.isActive?"Désactivé":"Activé"}`); fetchData(page); }
    catch(e:any) { showToast("❌ "+e.message, false); }
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer définitivement ce professionnel ?")) return;
    try { await api.delete(`/api/professionals/${id}`); showToast("✅ Supprimé"); fetchData(page); }
    catch(e:any) { showToast("❌ "+e.message, false); }
  };

  // ── Grouper slots par date ──────────────────────────────────────────────────
  const slotsByDate = slots.filter(s=>s.date>=new Date().toISOString().slice(0,10))
    .reduce((acc,s)=>{ (acc[s.date]=acc[s.date]||[]).push(s); return acc; },{} as Record<string,Slot[]>);
  const futureDates = Object.keys(slotsByDate).sort();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professionnels</h1>
              <p className="text-sm text-gray-500 mt-0.5">{total} professionnels enregistrés</p>
            </div>
            {isAdmin && (
              <button onClick={openCreate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2">
                + Ajouter un professionnel
              </button>
            )}
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label:"Total",    value:total,                                           icon:"👨‍⚕️", c:"bg-indigo-50 text-indigo-700" },
              { label:"Vérifiés", value:items.filter(p=>p.isVerified).length,            icon:"✅",  c:"bg-green-50 text-green-700"   },
              { label:"En ligne", value:items.filter(p=>p.isOnline).length,              icon:"💻",  c:"bg-blue-50 text-blue-700"     },
              { label:"Inactifs", value:items.filter(p=>!p.isActive).length,             icon:"⏸️",  c:"bg-gray-50 text-gray-500"     },
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${s.c}`}>{s.icon}</div>
                <div>
                  <div className="font-bold text-gray-900 text-xl leading-none">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filtres + recherche */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input type="text" placeholder="Rechercher par nom, ville, spécialité…"
              value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {([["","Tous"],["verified","Vérifiés"],["unverified","Non vérifiés"],["inactive","Inactifs"]] as [string,string][]).map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter===v?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">{Array(6).fill(0).map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16"/>
            ))}</div>
          ) : items.length===0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="text-5xl mb-3">👨‍⚕️</div>
              <div className="font-semibold text-gray-900 mb-1">Aucun professionnel trouvé</div>
              <div className="text-sm text-gray-400">
                {search ? "Essayez un autre terme de recherche" : "Commencez par en ajouter un"}
              </div>
              {isAdmin && !search && (
                <button onClick={openCreate} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
                  + Ajouter
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Professionnel</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Canaux</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Tarif</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Créneaux</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">Statut</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(pro=>(
                    <tr key={pro._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition cursor-default">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {pro.photo ? <img src={pro.photo} alt="" className="w-full h-full object-cover rounded-xl"/> : (pro.firstName[0]+pro.lastName[0])}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{pro.firstName} {pro.lastName}</div>
                            <div className="text-xs text-gray-400">{pro.email||"—"}</div>
                            {(pro as any).address && <div className="text-xs text-gray-300 truncate max-w-[160px]">📍 {(pro as any).address}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <span className="flex items-center gap-1">
                          <span>{TYPE_ICONS[pro.type]||"👤"}</span>
                          {TYPE_LABELS[pro.type]||pro.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          {pro.isOnline    && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">💻 Ligne</span>}
                          {pro.isInPerson  && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">🏢 Présentiel</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium">
                        {pro.sessionPrice ? `${pro.sessionPrice.toLocaleString()} ${pro.currency||"FCFA"}` : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {(pro.availableSlots?.filter(s=>!s.isBooked).length||0) > 0 ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-semibold">
                            {pro.availableSlots!.filter(s=>!s.isBooked).length} dispo
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-50 text-gray-400 px-2 py-1 rounded-full">Aucun</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${pro.isActive?"bg-green-50 text-green-600":"bg-gray-50 text-gray-400"}`}>
                            {pro.isActive?"Actif":"Inactif"}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${pro.isVerified?"bg-blue-50 text-blue-600":"bg-amber-50 text-amber-600"}`}>
                            {pro.isVerified?"✓ Vérifié":"En attente"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          {!pro.isVerified && isAdmin && (
                            <button onClick={()=>verify(pro)} className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition">
                              ✓ Vérifier
                            </button>
                          )}
                          <button onClick={()=>toggle(pro)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${pro.isActive?"bg-gray-50 text-gray-600 hover:bg-gray-100":"bg-green-50 text-green-600 hover:bg-green-100"}`}>
                            {pro.isActive?"Désactiver":"Activer"}
                          </button>
                          {isAdmin && (
                            <>
                              <button onClick={()=>openEdit(pro)} className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition">
                                ✏️ Modifier
                              </button>
                              <button onClick={()=>router.push(`/professionals/slots/${pro._id}`)} className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition">
                                📅 Agenda
                              </button>
                            </>
                          )}
                          {isSuperAdmin && (
                            <button onClick={()=>remove(pro._id)} className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition">
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {total > 20 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Page {page} · {total} professionnels</span>
                  <div className="flex gap-2">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Précédent</button>
                    <button disabled={page*20>=total} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Suivant →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL STEPPER — Ajouter / Modifier                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* ── Header + stepper ─────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 text-lg">
                  {modal==="create" ? "➕ Ajouter un professionnel" : `✏️ Modifier — ${editing.firstName} ${editing.lastName}`}
                </h2>
                <button onClick={()=>setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              {/* Steps */}
              <div className="flex items-center gap-0">
                {[
                  { n:1, label:"Informations" },
                  { n:2, label:"Créneaux" },
                  { n:3, label:"Confirmation" },
                ].map(({n,label},i)=>(
                  <div key={n} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        step===n ? "bg-indigo-600 border-indigo-600 text-white" :
                        step>n   ? "bg-green-500 border-green-500 text-white"   :
                                   "bg-white border-gray-200 text-gray-400"
                      }`}>
                        {step>n ? "✓" : n}
                      </div>
                      <span className={`text-xs mt-1 font-medium ${step>=n?"text-gray-700":"text-gray-400"}`}>{label}</span>
                    </div>
                    {i<2 && <div className={`h-0.5 flex-1 mb-5 mx-1 rounded ${step>n?"bg-green-400":"bg-gray-200"}`}/>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Corps scrollable ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── ÉTAPE 1 : Informations ─────────────────────────────────── */}
              {step===1 && (
                <div className="space-y-4">
                  {/* Nom / Prénom */}
                  <div className="grid grid-cols-2 gap-4">
                    {[["firstName","Prénom *"],["lastName","Nom *"]].map(([k,l])=>(
                      <div key={k}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{l}</label>
                        <input value={editing[k]||""} onChange={e=>setEditing((p:any)=>({...p,[k]:e.target.value}))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                      </div>
                    ))}
                  </div>

                  {/* Type + ville */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type *</label>
                      <select value={editing.type} onChange={e=>setEditing((p:any)=>({...p,type:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ville</label>
                      <input value={editing.city||""} onChange={e=>setEditing((p:any)=>({...p,city:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>

                  {/* Adresse + Pays */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse du cabinet</label>
                      <input value={editing.address||""} onChange={e=>setEditing((p:any)=>({...p,address:e.target.value}))}
                        placeholder="Ex: Av. Kwame Nkrumah, Secteur 4"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pays</label>
                      <input value={editing.country||""} onChange={e=>setEditing((p:any)=>({...p,country:e.target.value}))}
                        placeholder="Burkina Faso"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>

                  {/* Email + Téléphone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                      <input type="email" value={editing.email||""} onChange={e=>setEditing((p:any)=>({...p,email:e.target.value}))}
                        placeholder="pro@exemple.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone / WhatsApp</label>
                      <input value={editing.phone||""} onChange={e=>setEditing((p:any)=>({...p,phone:e.target.value}))}
                        placeholder="+226 XX XX XX XX"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>

                  {/* Tarif + durée + devise */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tarif séance</label>
                      <input type="number" value={editing.sessionPrice||""} onChange={e=>setEditing((p:any)=>({...p,sessionPrice:e.target.value}))}
                        placeholder="25000"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Durée (min)</label>
                      <select value={editing.sessionDuration||60} onChange={e=>setEditing((p:any)=>({...p,sessionDuration:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {DURATIONS.map(d=><option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Devise</label>
                      <select value={editing.currency||"FCFA"} onChange={e=>setEditing((p:any)=>({...p,currency:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Biographie</label>
                    <textarea value={editing.bio||""} onChange={e=>setEditing((p:any)=>({...p,bio:e.target.value}))}
                      rows={2} maxLength={500} placeholder="Présentation courte du professionnel…"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>

                  {/* Spécialités */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Spécialités (séparées par virgule)</label>
                    <input value={editing.specialties||""} onChange={e=>setEditing((p:any)=>({...p,specialties:e.target.value}))}
                      placeholder="Anxiété, Dépression, Gestion du stress…"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>

                  {/* Langues + Photo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Langues parlées</label>
                      <input value={editing.languages||""} onChange={e=>setEditing((p:any)=>({...p,languages:e.target.value}))}
                        placeholder="Français, Mooré, Dioula…"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL photo (optionnel)</label>
                      <input value={editing.photo||""} onChange={e=>setEditing((p:any)=>({...p,photo:e.target.value}))}
                        placeholder="https://…/photo.jpg"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Taux commission LinkMind</label>
                      <select value={editing.commissionRate||"0.10"} onChange={e=>setEditing((p:any)=>({...p,commissionRate:e.target.value}))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="0.05">5%</option>
                        <option value="0.10">10% (défaut)</option>
                        <option value="0.15">15%</option>
                        <option value="0.20">20%</option>
                      </select>
                    </div>
                  </div>

                  {/* Canaux */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Modes de consultation</p>
                    <div className="flex gap-4 flex-wrap">
                      {[
                        {key:"isInPerson",label:"🏢 Présentiel",desc:"Cabinet / bureau"},
                        {key:"isOnline",  label:"💻 En ligne",  desc:"Visioconférence"},
                      ].map(({key,label,desc})=>(
                        <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition flex-1 min-w-[140px] ${editing[key]?"border-indigo-400 bg-indigo-50":"border-gray-200 bg-white"}`}>
                          <input type="checkbox" checked={!!editing[key]} onChange={e=>setEditing((p:any)=>({...p,[key]:e.target.checked}))} className="rounded"/>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{label}</div>
                            <div className="text-xs text-gray-400">{desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {editing.isOnline && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lien visio personnel (optionnel)</label>
                        <input value={editing.personalMeetingLink||""} onChange={e=>setEditing((p:any)=>({...p,personalMeetingLink:e.target.value}))}
                          placeholder="https://meet.jit.si/… — vide = généré automatiquement par RDV"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex gap-4 flex-wrap">
                    {[{k:"isActive",l:"✅ Actif"},{k:"isVerified",l:"🔵 Vérifié"}].map(({k,l})=>(
                      <label key={k} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editing[k]} onChange={e=>setEditing((p:any)=>({...p,[k]:e.target.checked}))} className="rounded"/>
                        <span className="text-sm text-gray-700 font-medium">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 2 : Créneaux ─────────────────────────────────────── */}
              {step===2 && (
                <div className="space-y-5">
                  {/* Tabs */}
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {(["manual","weekly"] as const).map(t=>(
                      <button key={t} onClick={()=>setSlotTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${slotTab===t?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                        {t==="manual" ? "📅 Créneaux manuels" : "🔄 Règles hebdomadaires"}
                      </button>
                    ))}
                  </div>

                  {/* ── TAB : Manuels ─────────────────────────────────────── */}
                  {slotTab==="manual" && (
                    <>
                      {/* Formulaire ajout */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-3">Ajouter un créneau</p>
                        <div className="flex flex-wrap gap-3 items-end">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Date</label>
                            <input type="date" value={newSlot.date} min={todayPlus()}
                              onChange={e=>setNewSlot(s=>({...s,date:e.target.value}))}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Début</label>
                            <input type="time" value={newSlot.startTime}
                              onChange={e=>setNewSlot(s=>({...s,startTime:e.target.value}))}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fin</label>
                            <input type="time" value={newSlot.endTime}
                              onChange={e=>setNewSlot(s=>({...s,endTime:e.target.value}))}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                          <button onClick={addSlot}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
                            + Ajouter
                          </button>
                        </div>
                      </div>

                      {/* Liste créneaux groupés par date */}
                      {futureDates.length===0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <div className="text-3xl mb-2">📭</div>
                          <div className="text-sm">Aucun créneau ajouté</div>
                          <div className="text-xs mt-1">Utilisez les règles hebdomadaires pour en générer automatiquement</div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {futureDates.map(date=>(
                            <div key={date} className="bg-white border border-gray-100 rounded-xl p-3">
                              <div className="font-semibold text-gray-700 text-xs mb-2 capitalize">{fmtDate(date)}</div>
                              <div className="flex flex-wrap gap-2">
                                {slotsByDate[date].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(s=>(
                                  <div key={s._id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${s.isBooked?"bg-blue-50 border-blue-200 text-blue-600":"bg-green-50 border-green-200 text-green-700"}`}>
                                    <span>{s.startTime}–{s.endTime}</span>
                                    {s.isBooked
                                      ? <span className="bg-blue-200 text-blue-700 px-1 rounded text-[10px]">Réservé</span>
                                      : <button onClick={()=>removeSlot(s._id)} className="text-green-400 hover:text-red-500 font-bold ml-0.5">×</button>
                                    }
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Compteur */}
                      <div className="text-xs text-gray-400 text-right">
                        {slots.filter(s=>!s.isBooked).length} créneau(x) disponible(s) · {slots.filter(s=>s.isBooked).length} réservé(s)
                      </div>
                    </>
                  )}

                  {/* ── TAB : Hebdo ───────────────────────────────────────── */}
                  {slotTab==="weekly" && (
                    <>
                      {/* Formulaire règle */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-600 mb-3">Définir une règle hebdomadaire</p>
                        <div className="flex flex-wrap gap-3 items-end">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Jour</label>
                            <select value={wForm.dayOfWeek} onChange={e=>setWForm(f=>({...f,dayOfWeek:+e.target.value}))}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                            </select>
                          </div>
                          {[{label:"Début",key:"startTime"},{label:"Fin",key:"endTime"}].map(f=>(
                            <div key={f.key}>
                              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                              <input type="time" value={(wForm as any)[f.key]}
                                onChange={e=>setWForm(w=>({...w,[f.key]:e.target.value}))}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Durée</label>
                            <select value={wForm.slotDuration} onChange={e=>setWForm(f=>({...f,slotDuration:+e.target.value}))}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              {DURATIONS.map(d=><option key={d} value={d}>{d} min</option>)}
                            </select>
                          </div>
                          <button onClick={addWeekly}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl">
                            Ajouter
                          </button>
                        </div>
                      </div>

                      {/* Règles existantes */}
                      {weekly.length===0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm">Aucune règle définie</div>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>{["Jour","Horaires","Durée","Créneaux/j",""].map(h=><th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {[...weekly].sort((a,b)=>a.dayOfWeek-b.dayOfWeek).map(w=>{
                                const[sh,sm]=w.startTime.split(":").map(Number);
                                const[eh,em]=w.endTime.split(":").map(Number);
                                const cnt=Math.floor(((eh*60+em)-(sh*60+sm))/(w.slotDuration||60));
                                return(
                                  <tr key={w.dayOfWeek} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="px-4 py-2.5 font-medium">{DAYS[w.dayOfWeek]}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{w.startTime}–{w.endTime}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{w.slotDuration||60} min</td>
                                    <td className="px-4 py-2.5"><span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">{cnt}</span></td>
                                    <td className="px-4 py-2.5"><button onClick={()=>removeWeekly(w.dayOfWeek)} className="text-red-400 hover:text-red-600 text-xs">Suppr.</button></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Bouton générer */}
                      {weekly.length>0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-indigo-900 text-sm">Générer les créneaux (30 jours)</div>
                            <div className="text-xs text-indigo-600 mt-0.5">Crée automatiquement tous les créneaux à partir des règles ci-dessus.</div>
                          </div>
                          <button onClick={generateSlots}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex-shrink-0">
                            🚀 Générer
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── ÉTAPE 3 : Confirmation ─────────────────────────────────── */}
              {step===3 && (
                <div className="space-y-5">
                  <div className="text-center py-4">
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {modal==="create" ? "Professionnel créé avec succès !" : "Modifications enregistrées !"}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {slots.length > 0
                        ? `${slots.filter(s=>!s.isBooked).length} créneaux disponibles enregistrés.`
                        : "Aucun créneau ajouté — vous pouvez en ajouter depuis l'onglet Agenda."}
                    </p>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Nom</span><span className="font-semibold">{editing.firstName} {editing.lastName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{TYPE_ICONS[editing.type]} {TYPE_LABELS[editing.type]}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{editing.email||"—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Canaux</span>
                      <span className="flex gap-1.5">
                        {editing.isInPerson && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">🏢 Présentiel</span>}
                        {editing.isOnline   && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">💻 En ligne</span>}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-gray-500">Créneaux</span><span className="font-semibold text-green-600">{slots.filter(s=>!s.isBooked).length} disponibles</span></div>
                    {editing.sessionPrice && <div className="flex justify-between"><span className="text-gray-500">Tarif</span><span className="font-semibold">{Number(editing.sessionPrice).toLocaleString()} {editing.currency||"FCFA"}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Statut</span>
                      <span className="flex gap-1.5">
                        {editing.isActive   && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Actif</span>}
                        {editing.isVerified && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">✓ Vérifié</span>}
                      </span>
                    </div>
                  </div>

                  {/* Raccourcis */}
                  {newProId && (
                    <div className="flex gap-3">
                      <button onClick={()=>{ setModal(null); router.push(`/professionals/slots/${newProId}`); }}
                        className="flex-1 py-2.5 border-2 border-indigo-200 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition">
                        📅 Gérer l&apos;agenda complet
                      </button>
                      <button onClick={finalize}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                        Terminer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer navigation ─────────────────────────────────────────── */}
            {step < 3 && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                {step>1 && (
                  <button onClick={()=>setStep(s=>s-1)}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                    ← Retour
                  </button>
                )}
                <button onClick={()=>setModal(null)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <div className="flex-1"/>
                {step===1 && (
                  <button onClick={saveInfo} disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                    {saving ? "Enregistrement…" : "Suivant → Créneaux"}
                  </button>
                )}
                {step===2 && (
                  <button onClick={saveSlots} disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl text-sm font-semibold transition">
                    {saving ? "Enregistrement…" : `Enregistrer (${slots.length} créneaux) →`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm shadow-xl z-50 text-white ${toast.ok?"bg-gray-900":"bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </AuthGuard>
  );
}