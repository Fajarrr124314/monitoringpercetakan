"use client";

import { useEffect, useState } from "react";
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
  Printer,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Order & Nota", icon: FileText },
  { href: "/orders/new", label: "Order Baru", icon: PlusCircle, highlight: true },
  { href: "/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/harga", label: "Daftar Harga", icon: Tag },
  { href: "/anggaran", label: "Anggaran", icon: Wallet },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <aside
      className={`border-b border-slate-200/80 bg-white shadow-xs md:sticky md:top-0 md:h-screen md:shrink-0 md:border-r md:border-b-0 md:flex md:flex-col md:justify-between transition-all duration-200 ease-in-out ${
        isCollapsed ? "md:w-[68px]" : "md:w-60"
      }`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`flex items-center border-b border-slate-100 py-3.5 transition-all ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white shadow-sm shadow-blue-500/30">
              <Printer className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900 leading-tight">
                  Monitoring Percetakan
                </div>
                <div className="truncate text-[11px] font-medium text-slate-400">
                  Sakinah Printing
                </div>
              </div>
            )}
          </div>

          {/* Toggle Button di Header (hanya saat expanded) */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Ciutkan Sidebar (Hanya Ikon)"
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className={`flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:space-y-1 ${
            isCollapsed ? "md:px-2 md:py-3" : "md:p-3"
          }`}
        >
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
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isCollapsed
                    ? "justify-center p-2.5"
                    : "gap-2.5 px-3 py-2"
                } ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : item.highlight
                    ? "text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 hover:text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                    active
                      ? "text-white"
                      : item.highlight
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Footer / Indicator & Toggle Button */}
      <div className="hidden border-t border-slate-100 p-2 md:block">
        {/* Partnership Indicator (hanya saat expanded) */}
        {!isCollapsed ? (
          <div className="mb-2 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <CalendarClock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Siklus 15 Hari</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Kerjasama penagihan berkala percetakan.
            </p>
          </div>
        ) : null}

        {/* Toggle Expand / Collapse Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          className={`flex w-full items-center rounded-lg border border-slate-200/80 bg-slate-50/80 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition ${
            isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2"
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          ) : (
            <>
              <span className="text-[11px]">Ciutkan Sidebar</span>
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
