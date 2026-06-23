"use client";
import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const MAIN_API = process.env.NEXT_PUBLIC_MAIN_API_URL || "https://linkmind-backend-sub4.onrender.com";

function RefuseBookingContent() {
  const params      = useSearchParams();
  const bookingId   = params.get("bookingId");
  const token       = params.get("token");

  const [reason,    setReason]  = useState("");
  const [status,    setStatus]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message,   setMessage] = useState("");

  useEffect(() => {
    if (!bookingId || !token) {
      setStatus("error");
      setMessage("Lien invalide ou expiré.");
    }
  }, [bookingId, token]);

  const handleRefuse = async () => {
    if (!reason.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(
        `${MAIN_API}/api/professionals/bookings/${bookingId}/pro-refuse?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setStatus("success");
      setMessage("Le rendez-vous a été refusé. Le patient a été notifié par email.");
    } catch (e: any) {
      setStatus("error");
      const msg = e.message || "";
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
        setMessage("Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez.");
      } else {
        setMessage(msg || "Une erreur est survenue.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF7F5 50%, #FFF8EE 100%)" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-lg overflow-hidden"
            style={{ background: "#77021D" }}>
            <Image
              src="/logo.png"
              alt="LinkMind"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-black text-gray-900">LinkMind</h1>
          <p className="text-sm mt-1" style={{ color: "#9A8A8A" }}>Gestion des rendez-vous</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8"
          style={{ border: "1px solid #EDE0DC" }}>

          {/* Succès */}
          {status === "success" && (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Refus enregistré</h2>
              <p className="text-sm" style={{ color: "#64748b" }}>{message}</p>
              <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>
                Vous pouvez fermer cette page.
              </p>
            </div>
          )}

          {/* Erreur */}
          {status === "error" && (
            <div className="text-center">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {message.includes("connexion") ? "Erreur de connexion" : "Lien invalide"}
              </h2>
              <p className="text-sm" style={{ color: "#64748b" }}>{message}</p>
              {!message.includes("connexion") && (
                <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>
                  Ce lien a peut-être déjà été utilisé ou a expiré (48h).
                </p>
              )}
              {message.includes("connexion") && (
                <button
                  onClick={() => { setStatus("idle"); setMessage(""); }}
                  className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "#77021D" }}>
                  Réessayer
                </button>
              )}
            </div>
          )}

          {/* Formulaire */}
          {(status === "idle" || status === "loading") && bookingId && token && (
            <>
              {/* Bandeau avertissement */}
              <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <span className="text-xl mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#991B1B" }}>
                    Refus de rendez-vous
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>
                    Cette action est irréversible. Le patient sera notifié
                    avec le motif que vous indiquez.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: "#6B6060" }}>
                  Motif du refus <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex : Je ne suis pas disponible à cette date, mon agenda est complet ce mois-ci..."
                  rows={4}
                  maxLength={500}
                  disabled={status === "loading"}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition"
                  style={{ border: "1px solid #EDE0DC", background: "#FAFAFA" }}
                  onFocus={e => e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.15)"}
                  onBlur={e => e.target.style.boxShadow = "none"}
                />
                <p className="text-xs mt-1 text-right" style={{ color: "#94a3b8" }}>
                  {reason.length}/500
                </p>
              </div>

              <button
                onClick={handleRefuse}
                disabled={!reason.trim() || status === "loading"}
                className="w-full py-3 font-semibold text-sm rounded-xl transition text-white"
                style={{
                  background: !reason.trim() || status === "loading"
                    ? "#D1D5DB"
                    : "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
                  cursor: !reason.trim() || status === "loading" ? "not-allowed" : "pointer",
                }}>
                {status === "loading" ? "Envoi en cours..." : "❌ Confirmer le refus"}
              </button>

              <p className="text-center text-xs mt-4" style={{ color: "#94a3b8" }}>
                Si vous souhaitez accepter ce rendez-vous, ignorez cette page et
                utilisez le bouton <strong>Confirmer</strong> dans l&apos;email initial.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#C4B0B0" }}>
          LinkMind © {new Date().getFullYear()} — Bien-être des jeunes africains
        </p>
      </div>
    </div>
  );
}

export default function RefuseBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    }>
      <RefuseBookingContent />
    </Suspense>
  );
}