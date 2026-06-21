"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getAdmin, api } from "@/lib/api";

type AdminRole = "super_admin" | "admin" | "moderator" | "analyst";

const NAV_ALL = [
  { href: "/dashboard",     icon: "📊", label: "Dashboard",        badge: null,       minRole: "analyst"   },
  { href: "/users",         icon: "👥", label: "Utilisateurs",     badge: null,       minRole: "admin"     },
  { href: "/bookings",      icon: "📅", label: "Réservations",     badge: "bookings", minRole: "admin"     },
  { href: "/content",       icon: "🚨", label: "Modération",       badge: "content",  minRole: "moderator" },
  { href: "/challenges",    icon: "🏆", label: "Défis",            badge: null,       minRole: "admin"     },
  { href: "/professionals", icon: "🩺", label: "Professionnels",   badge: null,       minRole: "admin"     },
  { href: "/ads",           icon: "📢", label: "Annonces",         badge: null,       minRole: "admin"     },
  { href: "/database",      icon: "🗄️", label: "Base de données",  badge: null,       minRole: "admin"     },
  { href: "/reports",       icon: "📈", label: "Rapports",         badge: null,       minRole: "analyst"   },
  { href: "/settings",      icon: "⚙️", label: "Paramètres",       badge: null,       minRole: "analyst"   },
];

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4, admin: 3, moderator: 2, analyst: 1,
};
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin", admin: "Administrateur",
  moderator: "Modérateur",   analyst: "Analyste",
};
function hasAccess(role: AdminRole, min: string) {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[min as AdminRole] || 0);
}

interface Props { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const admin    = getAdmin();
  const role: AdminRole = (admin?.role as AdminRole) || "analyst";
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const r: Record<string, number> = {};
        if (hasAccess(role, "admin"))     { const b = await api.get<{ pending: number }>("/api/bookings/stats"); r.bookings = b.pending; }
        if (hasAccess(role, "moderator")) { const c = await api.get<{ pending: number }>("/api/content/stats");  r.content  = c.pending; }
        setBadges(r);
      } catch { /* silencieux */ }
    };
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [role]);

  const nav = NAV_ALL.filter(i => hasAccess(role, i.minRole));

  return (
    <>
      {/* Overlay mobile — cliquable pour fermer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900
        flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-white/[.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#77021D] flex items-center justify-center">
              {/* Logo depuis public/ — remplace /logo.png par le vrai nom de ton fichier */}
              <Image
                src="/logo.png"
                alt="LinkMind"
                width={36}
                height={36}
                className="object-contain"
                onError={() => {}}
              />
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">LinkMind</div>
              <div className="text-[10px] text-gray-500">Administration</div>
            </div>
          </div>
        </div>

        {/* ── Badge rôle ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pt-3 pb-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            role === "super_admin" ? "bg-purple-500/20 text-purple-300"  :
            role === "admin"       ? "bg-[#77021D]/40  text-red-200"     :
            role === "moderator"   ? "bg-amber-500/20  text-amber-300"   :
                                     "bg-gray-500/20   text-gray-300"
          }`}>
            {role === "super_admin" ? "👑" : role === "admin" ? "🛡️" : role === "moderator" ? "⚖️" : "📊"}
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* ── Navigation — scrollable, pousse le logout en bas ──────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          <ul className="space-y-0.5 list-none p-0 m-0">
            {nav.map(item => {
              const active = pathname.startsWith(item.href);
              const count  = item.badge ? (badges[item.badge] || 0) : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all no-underline ${
                      active
                        ? "bg-[#77021D] text-white font-semibold"
                        : "text-gray-400 hover:bg-white/[.06] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                        active ? "bg-white/20 text-white" : "bg-[#F5B731] text-gray-900"
                      }`}>
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── User info + Logout — TOUJOURS VISIBLE (flex-shrink-0) ───────── */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-white/[.07]">
          {admin && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#77021D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(admin.name?.[0] || admin.email?.[0] || "A").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-semibold truncate">{admin.name || "Admin"}</div>
                <div className="text-[10px] text-gray-500 truncate">{admin.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => { clearSession(); router.push("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer border-none bg-transparent"
          >
            <span className="text-base w-5 text-center">🚪</span>
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}