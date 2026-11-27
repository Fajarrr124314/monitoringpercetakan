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
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Menu,
  X,
  MoreHorizontal,
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // Tutup drawer mobile saat pindah halaman
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const isNavActive = (href: string) => {
    if (href === "/orders") {
      return pathname === "/orders" || /^\/orders\/(?!new)/.test(pathname);
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP APP BAR (Hanya Tampil di Layar HP < md) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 py-2.5 backdrop-blur-md shadow-xs md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-0.5 shadow-2xs">
            <img
              src="/logos.png"
              alt="Logo Percetakan Sakinah"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-900 leading-tight">
              Percetakan Sakinah
            </div>
            <div className="truncate text-[10px] font-semibold text-indigo-600">
              Monitoring System
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Order</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE SLIDE-OVER DRAWER (Sheet Menu Lengkap di Layar HP) */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col justify-between bg-white p-4 shadow-2xl transition-transform animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-0.5">
                    <img
                      src="/logos.png"
                      alt="Logo Percetakan Sakinah"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Percetakan Sakinah</h3>
                    <p className="text-[10px] text-indigo-600 font-semibold">Monitoring System</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items in Drawer */}
              <nav className="mt-3 space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                          : item.highlight
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-white" : item.highlight ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom 15 Days Info in Drawer */}
            <div className="border-t border-slate-100 pt-3">
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <CalendarClock className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Siklus 15 Hari</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Kerjasama sistem pembayaran per 15 hari di percetakan Sakinah.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MOBILE FIXED BOTTOM NAVIGATION BAR (Mudah Dijangkau Jempol di HP) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-md shadow-lg shadow-slate-900/5 md:hidden">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
            isNavActive("/dashboard") ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        {/* Order & Nota */}
        <Link
          href="/orders"
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
            isNavActive("/orders") ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-5 w-5" />
          <span>Order</span>
        </Link>

        {/* + Order Baru (Elevated Button di Tengah) */}
        <Link
          href="/orders/new"
          className="flex -mt-4 flex-col items-center justify-center rounded-full bg-blue-600 p-3 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700 transition transform active:scale-95"
          title="Buat Order Baru"
        >
          <PlusCircle className="h-6 w-6" />
        </Link>

        {/* Pelanggan */}
        <Link
          href="/pelanggan"
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
            isNavActive("/pelanggan") ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Pelanggan</span>
        </Link>

        {/* Menu Lainnya */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 4. DESKTOP COLLAPSIBLE SIDEBAR (Tampil di Layar >= md) */}
      {/* ========================================================================= */}
      <aside
        className={`hidden border-r border-slate-200/80 bg-white shadow-xs md:sticky md:top-0 md:h-screen md:shrink-0 md:flex md:flex-col md:justify-between transition-all duration-200 ease-in-out ${
          isCollapsed ? "md:w-[68px]" : "md:w-60"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div
            className={`flex items-center border-b border-slate-100 py-3 transition-all ${
              isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
            }`}
          >
            {isCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Percetakan Sakinah - Klik untuk perluas sidebar"
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white border border-slate-200/90 p-1 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 transition-all group cursor-pointer"
              >
                <img
                  src="/logos.png"
                  alt="Logo Percetakan Sakinah"
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              </button>
            ) : (
              <>
                <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-slate-200/90 p-1 shadow-2xs transition-transform group-hover:scale-102">
                    <img
                      src="/logos.png"
                      alt="Logo Percetakan Sakinah"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900 leading-tight">
                      Percetakan Sakinah
                    </div>
                    <div className="truncate text-[10px] font-semibold text-indigo-600 mt-0.5">
                      Monitoring System
                    </div>
                  </div>
                </Link>

                {/* Toggle Button di Header */}
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Ciutkan Sidebar (Hanya Ikon)"
                  className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Items Desktop */}
          <nav
            className={`p-2 space-y-1 ${
              isCollapsed ? "px-2 py-3" : "p-3"
            }`}
          >
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);

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

        {/* Desktop Bottom Section: Footer / Indicator & Toggle Button */}
        <div className="border-t border-slate-100 p-2">
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
    </>
  );
}
