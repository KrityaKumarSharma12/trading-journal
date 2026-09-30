"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  PlusCircle,
  LineChart,
  BookOpen,
  Target,
  CalendarDays,
  Upload,
  ShieldCheck,
  Link2,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: ListOrdered },
  { href: "/trades/new", label: "New Trade", icon: PlusCircle },
  { href: "/strategies", label: "Strategies", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/import", label: "Import", icon: Upload },
  {href: "/settings/brokers", label: "Brokers", icon: Link2}
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const isAdmin = user.role === "ADMIN";
  const adminActive = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex bg-slate-950">
      <aside className="w-60 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <span className="font-semibold text-white">Trading Journal</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Admin-only link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                adminActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm text-slate-300 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="shrink-0">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}