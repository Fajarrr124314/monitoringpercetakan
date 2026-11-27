import { redirect } from "next/navigation";
import { getActivePartner } from "@/lib/partners";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const activePartner = await getActivePartner();

  // Jika belum memilih mitra / belum login PIN, arahkan ke portal kerjasama di root /
  if (!activePartner) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50/60 md:flex">
      <div className="no-print">
        <Sidebar partner={activePartner} />
      </div>
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-7xl p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
