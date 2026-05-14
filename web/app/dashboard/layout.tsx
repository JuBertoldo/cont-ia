"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth, AuthProvider } from "@/lib/authContext";
import {
  LayoutDashboard, Building2, Users, Ticket, DollarSign,
  Database, Key, BarChart3, LogOut, Cpu,
} from "lucide-react";

const superAdminNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Visão Geral" },
  { href: "/dashboard/empresas", icon: Building2, label: "Empresas" },
  { href: "/dashboard/usuarios", icon: Users, label: "Usuários" },
  { href: "/dashboard/chamados", icon: Ticket, label: "Chamados" },
  { href: "/dashboard/financeiro", icon: DollarSign, label: "Financeiro" },
  { href: "/dashboard/licencas", icon: Key, label: "Licenças" },
  { href: "/dashboard/dataset", icon: Database, label: "Dataset / IA" },
  { href: "/dashboard/deteccoes", icon: BarChart3, label: "Detecções" },
  { href: "/dashboard/metrics", icon: Cpu, label: "Inferência" },
];

const supportNav = [
  { href: "/dashboard/chamados", icon: Ticket, label: "Chamados" },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const nav = user?.role === "super_admin" ? superAdminNav : supportNav;

  return (
    <aside className="w-64 min-h-screen bg-surface-card border-r border-surface-border flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-surface-border">
        <h1 className="text-xl font-bold text-brand">Cont.IA</h1>
        <p className="text-xs text-slate-500 mt-0.5">Painel Administrativo</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-brand text-black"
                  : "text-slate-400 hover:text-white hover:bg-surface"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-surface-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm text-white font-medium truncate">{user?.nome}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace("_", " ")}</p>
        </div>
        <button
          onClick={async () => { await logout(); router.replace("/login"); }}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm px-3 py-2 w-full rounded-xl transition"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen p-8">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardGuard>{children}</DashboardGuard>
    </AuthProvider>
  );
}
