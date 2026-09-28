"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ListOrdered,
  Target,
  BookOpen,
  Trash2,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    trades: number;
    strategies: number;
    journalEntries: number;
  };
}

interface AdminStats {
  users: number;
  trades: number;
  strategies: number;
  journals: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/stats"),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (e: any) {
      setErr(e.response?.data?.error || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Guard — only admins
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleRole(u: AdminUser) {
    const newRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: newRole });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to update role");
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !confirm(
        `Delete ${u.email}?\n\nThis will permanently delete their account, trades, strategies, and journal entries.`
      )
    )
      return;

    try {
      await api.delete(`/admin/users/${u.id}`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to delete user");
    }
  }

  if (loading || !stats) {
    return <div className="p-8 text-slate-400">Loading...</div>;
  }

  if (err) {
    return (
      <div className="p-8">
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3">
          {err}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Users", value: stats.users, icon: Users, color: "text-blue-400" },
    {
      label: "Trades",
      value: stats.trades,
      icon: ListOrdered,
      color: "text-emerald-400",
    },
    {
      label: "Strategies",
      value: stats.strategies,
      icon: Target,
      color: "text-purple-400",
    },
    {
      label: "Journal Entries",
      value: stats.journals,
      icon: BookOpen,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          Admin Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Manage users and monitor system activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{s.label}</p>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-3xl font-semibold mt-2 text-white">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Users</h2>
          <span className="text-sm text-slate-500">
            {users.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-right px-4 py-3">Trades</th>
                <th className="text-right px-4 py-3">Strategies</th>
                <th className="text-right px-4 py-3">Entries</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = user?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-t border-slate-800 hover:bg-slate-800/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{u.email}</span>
                        {isSelf && (
                          <span className="text-xs text-slate-500">
                            (you)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                          u.role === "ADMIN"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {u.role === "ADMIN" ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {u._count.trades}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {u._count.strategies}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {u._count.journalEntries}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleRole(u)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "You can't change your own role"
                              : u.role === "ADMIN"
                              ? "Demote to USER"
                              : "Promote to ADMIN"
                          }
                          className={`text-xs px-2 py-1 rounded border transition ${
                            isSelf
                              ? "opacity-40 cursor-not-allowed border-slate-800 text-slate-500"
                              : u.role === "ADMIN"
                              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={isSelf}
                          title={isSelf ? "You can't delete yourself" : "Delete user"}
                          className={`p-1.5 rounded transition ${
                            isSelf
                              ? "opacity-40 cursor-not-allowed text-slate-600"
                              : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}