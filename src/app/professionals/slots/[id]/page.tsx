"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar   from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { api }   from "@/lib/api";

interface Slot { _id: string; date: string; startTime: string; endTime: string; isBooked: boolean; }
interface WeeklyAvail { dayOfWeek: number; startTime: string; endTime: string; slotDuration: number; }
interface Pro {
  _id: string; firstName: string; lastName: string; type: string;
  isOnline: boolean; isInPerson: boolean;
  availableSlots: Slot[]; weeklyAvailability: WeeklyAvail[];
  personalMeetingLink?: string; meetingProvider?: string; sessionDuration?: number;
}

const DAYS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const PROVIDERS = ["jitsi","whereby","zoom","meet"];
function fmtDate(iso: string) {
  try { const d = new Date(iso+"T12:00:00"); return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(d); }
  catch { return iso; }
}
function todayPlus(n=1) { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

export default function SlotsPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [pro, setPro]         = useState<Pro|null>(null);
  const [loading,setLoading]  = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast,  setToast]    = useState("");
  const [tab, setTab]         = useState<"manual"|"weekly"|"settings">("manual");
  const [newSlot,setNewSlot]  = useState({ date:todayPlus(), startTime:"09:00", endTime:"10:00" });
  const [weeklyForm,setWeeklyForm] = useState<WeeklyAvail>({ dayOfWeek:1, startTime:"09:00", endTime:"17:00", slotDuration:60 });
  const [meetingLink,setMeetingLink] = useState("");
  const [meetingProvider,setMeetingProvider] = useState("jitsi");

  const showToast = (msg:string,dur=3500) => { setToast(msg); setTimeout(()=>setToast(""),dur); };

  const fetchPro = useCallback(async()=>{
    // Guard: id peut être undefined pendant le premier rendu Next.js (useParams hydration)
    if (!id || id === "undefined") return;
    setLoading(true);
    try {
      const res = await api.get<any>(`/api/professionals/${id}`);
      // L'admin backend renvoie { data: pro }, le backend principal renvoie { professional: pro }
      const p = res.data ?? res.professional ?? res;
      setPro(p); setMeetingLink(p.personalMeetingLink||""); setMeetingProvider(p.meetingProvider||"jitsi");
    } catch(e:any){ showToast("❌ "+e.message); }
    finally{ setLoading(false); }
  },[id]);

  useEffect(()=>{ fetchPro(); },[fetchPro]);

  const saveSlots = async(slots:any[],weekly:any[])=>{
    if(!pro) return; setSaving(true);
    try{
      await api.put(`/api/professionals/${pro._id}/slots`,{slots,weeklyAvailability:weekly});
      showToast("✅ Créneaux mis à jour"); fetchPro();
    }catch(e:any){ showToast("❌ "+e.message); }
    finally{ setSaving(false); }
  };

  const addSlot = async()=>{
    if(!pro) return;
    const slotId=`${newSlot.date}_${newSlot.startTime}`;
    if(pro.availableSlots?.some(s=>s._id===slotId)) return showToast("⚠️ Ce créneau existe déjà");
    const updated=[...(pro.availableSlots||[]),
      {_id:slotId,date:newSlot.date,startTime:newSlot.startTime,endTime:newSlot.endTime,isBooked:false}
    ].sort((a,b)=>a._id.localeCompare(b._id));
    await saveSlots(updated,pro.weeklyAvailability);
  };

  const removeSlot = async(slotId:string)=>{
    if(!pro) return;
    const slot=pro.availableSlots.find(s=>s._id===slotId);
    if(slot?.isBooked&&!confirm("Ce créneau est réservé. Supprimer quand même ?")) return;
    await saveSlots(pro.availableSlots.filter(s=>s._id!==slotId),pro.weeklyAvailability);
  };

  const addWeeklyRule = async()=>{
    if(!pro) return;
    const exists=pro.weeklyAvailability?.some(w=>w.dayOfWeek===weeklyForm.dayOfWeek);
    const updated=exists
      ? pro.weeklyAvailability.map(w=>w.dayOfWeek===weeklyForm.dayOfWeek?weeklyForm:w)
      : [...(pro.weeklyAvailability||[]),weeklyForm];
    await saveSlots(pro.availableSlots,updated);
  };

  const removeWeeklyRule = async(dow:number)=>{
    if(!pro) return;
    await saveSlots(pro.availableSlots,pro.weeklyAvailability.filter(w=>w.dayOfWeek!==dow));
  };

  const generateFromWeekly = async()=>{
    if(!pro||!pro.weeklyAvailability?.length) return showToast("⚠️ Aucune règle définie");
    if(!confirm("Générer les créneaux pour les 30 prochains jours ?")) return;
    const generated:Slot[]=[];
    const now=new Date();
    for(let d=1;d<=30;d++){
      const day=new Date(now); day.setDate(day.getDate()+d);
      const dow=day.getDay();
      const rule=pro.weeklyAvailability.find(w=>w.dayOfWeek===dow);
      if(!rule) continue;
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
    const bookedSlots=(pro.availableSlots||[]).filter(s=>s.isBooked);
    const genIds=new Set(generated.map(s=>s._id));
    const merged=[...bookedSlots.filter(s=>!genIds.has(s._id)),...generated].sort((a,b)=>a._id.localeCompare(b._id));
    await saveSlots(merged,pro.weeklyAvailability);
    showToast(`✅ ${generated.length} créneaux générés`);
  };

  const saveMeetingSettings=async()=>{
    if(!pro) return; setSaving(true);
    try{
      await api.patch(`/api/professionals/${pro._id}`,{
        personalMeetingLink:meetingLink||null,
        meetingProvider:meetingLink?meetingProvider:null,
      });
      showToast("✅ Paramètres visio sauvegardés"); fetchPro();
    }catch(e:any){ showToast("❌ "+e.message); }
    finally{ setSaving(false); }
  };

  const slotsByDate=(pro?.availableSlots||[]).reduce((acc,s)=>{ (acc[s.date]=acc[s.date]||[]).push(s); return acc; },{} as Record<string,Slot[]>);
  const futureDates=Object.keys(slotsByDate).filter(d=>d>=new Date().toISOString().slice(0,10)).sort();
  const totalAvail=(pro?.availableSlots||[]).filter(s=>!s.isBooked).length;
  const totalBooked=(pro?.availableSlots||[]).filter(s=>s.isBooked).length;

  if(loading) return <AuthGuard><div className="flex min-h-screen"><Sidebar/><main className="ml-64 flex-1 flex items-center justify-center"><div className="text-3xl animate-spin">⏳</div></main></div></AuthGuard>;

  return(
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar/>
        <main className="ml-64 flex-1 p-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={()=>router.back()} className="text-gray-400 hover:text-gray-700 text-xl leading-none">←</button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agenda — {pro?.firstName} {pro?.lastName}</h1>
              <p className="text-sm text-gray-500">{totalAvail} créneaux disponibles · {totalBooked} réservés</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {label:"Disponibles",value:totalAvail,icon:"🟢",c:"text-green-700"},
              {label:"Réservés",value:totalBooked,icon:"🔵",c:"text-blue-700"},
              {label:"Règles hebdo",value:pro?.weeklyAvailability?.length||0,icon:"📅",c:"text-purple-700"},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div><div className={`font-bold text-xl ${s.c}`}>{s.value}</div><div className="text-xs text-gray-400">{s.label}</div></div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
            {(["manual","weekly","settings"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab===t?"bg-white shadow text-gray-900":"text-gray-500 hover:text-gray-700"}`}>
                {t==="manual"?"📅 Créneaux manuels":t==="weekly"?"🔄 Règles hebdo":"🎥 Visio"}
              </button>
            ))}
          </div>

          {/* ── TAB MANUAL ── */}
          {tab==="manual"&&(
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Ajouter un créneau</h2>
                <div className="flex flex-wrap gap-4 items-end">
                  {[
                    {label:"Date",type:"date",val:newSlot.date,min:todayPlus(),set:(v:string)=>setNewSlot(s=>({...s,date:v}))},
                    {label:"Heure début",type:"time",val:newSlot.startTime,set:(v:string)=>setNewSlot(s=>({...s,startTime:v}))},
                    {label:"Heure fin",type:"time",val:newSlot.endTime,set:(v:string)=>setNewSlot(s=>({...s,endTime:v}))},
                  ].map(f=>(
                    <div key={f.label}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                      <input type={f.type} value={f.val} min={f.min} onChange={e=>f.set(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  ))}
                  <button onClick={addSlot} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl">+ Ajouter</button>
                </div>
              </div>

              {futureDates.length===0?(
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="font-semibold text-gray-900">Aucun créneau futur</div>
                  <div className="text-sm text-gray-400 mt-1">Ajoutez des créneaux ou générez-les depuis les règles hebdomadaires.</div>
                </div>
              ):(
                <div className="space-y-3">
                  {futureDates.map(date=>(
                    <div key={date} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="font-semibold text-gray-800 mb-3 capitalize">{fmtDate(date)}</div>
                      <div className="flex flex-wrap gap-2">
                        {slotsByDate[date].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(slot=>(
                          <div key={slot._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border ${slot.isBooked?"bg-blue-50 border-blue-200 text-blue-700":"bg-green-50 border-green-200 text-green-700"}`}>
                            <span>{slot.startTime}–{slot.endTime}</span>
                            {slot.isBooked
                              ?<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">Réservé</span>
                              :<button onClick={()=>removeSlot(slot._id)} className="text-green-400 hover:text-red-500 font-bold text-xs">×</button>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB WEEKLY ── */}
          {tab==="weekly"&&(
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Définir une règle hebdomadaire</h2>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Jour</label>
                    <select value={weeklyForm.dayOfWeek} onChange={e=>setWeeklyForm(f=>({...f,dayOfWeek:+e.target.value}))}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  {[{label:"Début",key:"startTime"},{label:"Fin",key:"endTime"}].map(f=>(
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                      <input type="time" value={(weeklyForm as any)[f.key]} onChange={e=>setWeeklyForm(w=>({...w,[f.key]:e.target.value}))}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Durée (min)</label>
                    <select value={weeklyForm.slotDuration} onChange={e=>setWeeklyForm(f=>({...f,slotDuration:+e.target.value}))}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {[30,45,60,90,120].map(d=><option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                  <button onClick={addWeeklyRule} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl">Enregistrer</button>
                </div>
              </div>

              {(pro?.weeklyAvailability?.length||0)===0?(
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <div className="text-4xl mb-2">🗓️</div>
                  <div className="font-semibold text-gray-900">Aucune règle définie</div>
                </div>
              ):(
                <>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{["Jour","Horaires","Durée","Créneaux/jour",""].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...(pro?.weeklyAvailability||[])].sort((a,b)=>a.dayOfWeek-b.dayOfWeek).map(w=>{
                        const[sh,sm]=w.startTime.split(":").map(Number);
                        const[eh,em]=w.endTime.split(":").map(Number);
                        const cnt=Math.floor(((eh*60+em)-(sh*60+sm))/(w.slotDuration||60));
                        return(
                          <tr key={w.dayOfWeek} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{DAYS[w.dayOfWeek]}</td>
                            <td className="px-4 py-3 text-gray-600">{w.startTime}–{w.endTime}</td>
                            <td className="px-4 py-3 text-gray-600">{w.slotDuration||60} min</td>
                            <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">{cnt} créneaux</span></td>
                            <td className="px-4 py-3"><button onClick={()=>removeWeeklyRule(w.dayOfWeek)} className="text-red-400 hover:text-red-600 text-xs">Supprimer</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-indigo-900">Générer les créneaux (30 prochains jours)</div>
                    <div className="text-sm text-indigo-600 mt-0.5">Crée automatiquement tous les créneaux à partir des règles ci-dessus.</div>
                  </div>
                  <button onClick={generateFromWeekly} disabled={saving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl flex-shrink-0">🚀 Générer</button>
                </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB SETTINGS ── */}
          {tab==="settings"&&(
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Lien visioconférence personnel</h2>
                <p className="text-sm text-gray-500 mb-5">Si renseigné, prend priorité sur la génération automatique.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Fournisseur</label>
                    <div className="flex flex-wrap gap-2">
                      {PROVIDERS.map(p=>(
                        <button key={p} onClick={()=>setMeetingProvider(p)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${meetingProvider===p?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                          {p==="jitsi"?"🎥 Jitsi":p==="whereby"?"📹 Whereby":p==="zoom"?"🔵 Zoom":"🟩 Meet"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">URL de la salle (optionnel)</label>
                    <input type="url" value={meetingLink} onChange={e=>setMeetingLink(e.target.value)}
                      placeholder="https://meet.jit.si/mon-espace"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    <p className="text-xs text-gray-400 mt-1">Vide = lien unique généré automatiquement par RDV.</p>
                  </div>
                  <button onClick={saveMeetingSettings} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl">
                    {saving?"Enregistrement...":"💾 Sauvegarder"}
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <div className="font-semibold text-blue-900 mb-2">🤖 Génération automatique</div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>• <strong>Whereby API Key</strong> configurée → lien Whereby unique par RDV</div>
                  <div>• Sinon → lien <strong>Jitsi Meet</strong> gratuit généré automatiquement</div>
                  <div>• Le lien personnel ci-dessus <strong>prend priorité</strong></div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {toast&&<div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-xl z-50">{toast}</div>}
    </AuthGuard>
  );
}