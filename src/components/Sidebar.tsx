"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getAdmin, api } from "@/lib/api";

type AdminRole = "super_admin" | "admin" | "moderator" | "analyst";

// Navigation par rôle
const NAV_ALL = [
  { href: "/dashboard",     icon: "📊", label: "Dashboard",        badge: null,       minRole: "analyst"     },
  { href: "/users",         icon: "👥", label: "Utilisateurs",     badge: null,       minRole: "admin"       },
  { href: "/bookings",      icon: "📅", label: "Réservations",     badge: "bookings", minRole: "admin"       },
  { href: "/content",       icon: "🚨", label: "Modération",       badge: "content",  minRole: "moderator"   },
  { href: "/challenges",    icon: "🏆", label: "Défis",            badge: null,       minRole: "admin"       },
  { href: "/professionals", icon: "👨‍⚕️", label: "Professionnels",  badge: null,       minRole: "admin"       },
  { href: "/ads",           icon: "📢", label: "Annonces",         badge: null,       minRole: "admin"       },
  { href: "/reports",       icon: "📈", label: "Rapports",         badge: null,       minRole: "analyst"     },
  { href: "/settings",      icon: "⚙️", label: "Paramètres",       badge: null,       minRole: "analyst"     },
];

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 4, admin: 3, moderator: 2, analyst: 1,
};

function hasAccess(userRole: AdminRole, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole as AdminRole] || 0);
}

// Label du rôle
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin:       "Administrateur",
  moderator:   "Modérateur",
  analyst:     "Analyste",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const admin    = getAdmin();
  const role: AdminRole = admin?.role || "analyst";

  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const results: Record<string, number> = {};
        // Bookings stats : admin+ seulement
        if (hasAccess(role, "admin")) {
          const b = await api.get<{ pending: number }>("/api/bookings/stats");
          results.bookings = b.pending;
        }
        // Content stats : moderator+ seulement
        if (hasAccess(role, "moderator")) {
          const c = await api.get<{ pending: number }>("/api/content/stats");
          results.content = c.pending;
        }
        setBadges(results);
      } catch { /* silencieux */ }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000);
    return () => clearInterval(interval);
  }, [role]);

  const visibleNav = NAV_ALL.filter(item => hasAccess(role, item.minRole));

  // Grouper la nav
  const mainNav  = visibleNav.filter(i => !["reports","settings"].includes(i.href.slice(1)));
  const bottomNav = visibleNav.filter(i =>  ["reports","settings"].includes(i.href.slice(1)));

  const NavItem = ({ item }: { item: typeof NAV_ALL[0] }) => {
    const active = pathname.startsWith(item.href);
    const count  = item.badge ? badges[item.badge] : 0;
    return (
      <li>
        <Link href={item.href}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all no-underline ${
            active ? "bg-indigo-600 text-white font-semibold" : "text-gray-400 hover:bg-white/[.06] hover:text-white"
          }`}>
          <span className="flex items-center gap-3">
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </span>
          {(count ?? 0) > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              active ? "bg-white/20 text-white" : "bg-amber-500 text-white"
            }`}>
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0">
            🧠
          </div>
          <div>
            <div className="font-bold text-white text-sm">LinkMind</div>
            <div className="text-[10px] text-gray-400">Administration</div>
          </div>
        </div>
      </div>

      {/* Badge rôle */}
      <div className="px-4 pt-4 pb-1">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          role === "super_admin" ? "bg-purple-500/20 text-purple-300" :
          role === "admin"       ? "bg-indigo-500/20 text-indigo-300" :
          role === "moderator"   ? "bg-amber-500/20  text-amber-300"  :
                                   "bg-gray-500/20   text-gray-300"
        }`}>
          {role === "super_admin" ? "👑" : role === "admin" ? "🛡️" : role === "moderator" ? "⚖️" : "📊"}
          {ROLE_LABELS[role]}
        </div>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {mainNav.length > 0 && (
          <>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold px-3 mb-2 mt-2">Gestion</p>
            <ul className="space-y-0.5 list-none p-0">
              {mainNav.map(item => <NavItem key={item.href} item={item} />)}
            </ul>
          </>
        )}
        {bottomNav.length > 0 && (
          <>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold px-3 mb-2 mt-5">Analyse</p>
            <ul className="space-y-0.5 list-none p-0">
              {bottomNav.map(item => <NavItem key={item.href} item={item} />)}
            </ul>
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/[.07]">
        {admin && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {admin.name?.[0] || admin.email?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-semibold truncate">{admin.name || "Admin"}</div>
              <div className="text-[10px] text-gray-400">{admin.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => { clearSession(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer border-none bg-transparent"
        >
          <span className="text-base w-5 text-center">🚪</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}