"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getAdmin, api } from "@/lib/api";

type AdminRole = "super_admin" | "admin" | "moderator" | "analyst";

const NAV_ALL = [
  { href: "/dashboard",     icon: "📊", label: "Dashboard",        badge: null,       minRole: "analyst"     },
  { href: "/users",         icon: "👥", label: "Utilisateurs",     badge: null,       minRole: "admin"       },
  { href: "/bookings",      icon: "📅", label: "Réservations",     badge: "bookings", minRole: "admin"       },
  { href: "/content",       icon: "🚨", label: "Modération",       badge: "content",  minRole: "moderator"   },
  { href: "/challenges",    icon: "🏆", label: "Défis",            badge: null,       minRole: "admin"       },
  { href: "/professionals", icon: "🩺", label: "Professionnels",   badge: null,       minRole: "admin"       },
  { href: "/ads",           icon: "📢", label: "Annonces",         badge: null,       minRole: "admin"       },
  { href: "/database",      icon: "🗄️", label: "Base de données",  badge: null,       minRole: "admin"       },
  { href: "/reports",       icon: "📈", label: "Rapports",         badge: null,       minRole: "analyst"     },
  { href: "/settings",      icon: "⚙️", label: "Paramètres",       badge: null,       minRole: "analyst"     },
];

const ROLE_HIERARCHY: Record<AdminRole, number> = { super_admin: 4, admin: 3, moderator: 2, analyst: 1 };
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin", admin: "Administrateur", moderator: "Modérateur", analyst: "Analyste",
};

function hasAccess(userRole: AdminRole, minRole: string) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole as AdminRole] || 0);
}

interface SidebarProps { isOpen?: boolean; onClose?: () => void; }

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const admin    = getAdmin();
  const role: AdminRole = admin?.role || "analyst";

  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const results: Record<string, number> = {};
        if (hasAccess(role, "admin"))     { const b = await api.get<{ pending: number }>("/api/bookings/stats"); results.bookings = b.pending; }
        if (hasAccess(role, "moderator")) { const c = await api.get<{ pending: number }>("/api/content/stats");  results.content  = c.pending; }
        setBadges(results);
      } catch { /* silencieux */ }
    };
    fetchBadges();
    const id = setInterval(fetchBadges, 60_000);
    return () => clearInterval(id);
  }, [role]);

  const visibleNav  = NAV_ALL.filter(i => hasAccess(role, i.minRole));
  const mainNav     = visibleNav.filter(i => !["reports","settings"].includes(i.href.slice(1)));
  const bottomNav   = visibleNav.filter(i =>  ["reports","settings"].includes(i.href.slice(1)));

  const NavItem = ({ item }: { item: typeof NAV_ALL[0] }) => {
    const active = pathname.startsWith(item.href);
    const count  = item.badge ? badges[item.badge] : 0;
    return (
      <li>
        <Link
          href={item.href}
          onClick={onClose}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all no-underline ${
            active ? "bg-[#77021D] text-white font-semibold" : "text-gray-400 hover:bg-white/[.06] hover:text-white"
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </span>
          {(count ?? 0) > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              active ? "bg-white/20 text-white" : "bg-[#F5B731] text-gray-900"
            }`}>
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`admin-sidebar bg-gray-900 flex flex-col ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden bg-[#77021D] flex items-center justify-center">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">LinkMind</div>
              <div className="text-[10px] text-gray-500">Administration</div>
            </div>
          </div>
        </div>

        {/* Badge rôle */}
        <div className="px-4 pt-3 pb-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            role === "super_admin" ? "bg-purple-500/20 text-purple-300" :
            role === "admin"       ? "bg-[#77021D]/30 text-red-300"     :
            role === "moderator"   ? "bg-amber-500/20 text-amber-300"   :
                                     "bg-gray-500/20  text-gray-300"
          }`}>
            {role === "super_admin" ? "👑" : role === "admin" ? "🛡️" : role === "moderator" ? "⚖️" : "📊"}
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {mainNav.length > 0 && (
            <>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-3 mb-2 mt-2">Gestion</p>
              <ul className="space-y-0.5 list-none p-0 m-0">
                {mainNav.map(i => <NavItem key={i.href} item={i} />)}
              </ul>
            </>
          )}
          {bottomNav.length > 0 && (
            <>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-3 mb-2 mt-5">Analyse</p>
              <ul className="space-y-0.5 list-none p-0 m-0">
                {bottomNav.map(i => <NavItem key={i.href} item={i} />)}
              </ul>
            </>
          )}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/[.07]">
          {admin && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
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