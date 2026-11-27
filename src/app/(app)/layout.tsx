import { NavLinks } from "@/components/nav";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Order & Nota" },
  { href: "/orders/new", label: "+ Order Baru" },
  { href: "/pelanggan", label: "Pelanggan" },
  { href: "/harga", label: "Daftar Harga" },
  { href: "/anggaran", label: "Anggaran" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-4 py-3">
          <div className="font-semibold text-slate-900">Monitoring Percetakan</div>
          <div className="text-xs text-slate-500">Percetakan Sakinah</div>
        </div>
        <NavLinks links={NAV} />
      </aside>
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
