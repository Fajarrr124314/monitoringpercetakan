"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Tag,
  Wallet,
  Settings,
  CalendarClock,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Order & Nota", icon: FileText },
  { href: "/rekap", label: "Rekap 15 Hari", icon: CalendarClock },
  { href: "/orders/new", label: "Order Baru", icon: PlusCircle, highlight: true },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/harga", label: "Daftar Harga", icon: Tag },
  { href: "/anggaran", label: "Anggaran", icon: Wallet },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3 md:space-y-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/orders"
            ? pathname === "/orders" || /^\/orders\/(?!new)/.test(pathname)
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : item.highlight
                ? "text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 hover:text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                active ? "text-white" : item.highlight ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
