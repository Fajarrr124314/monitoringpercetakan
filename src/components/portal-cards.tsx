"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Unlock,
  KeyRound,
  Plus,
  ArrowRight,
  ShieldCheck,
  CalendarClock,
  X,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldAlert,
} from "lucide-react";
import type { Partner } from "@/lib/partners";
import {
  loginPartnerAction,
  updatePartnerPinSettingsAction,
  createPartnerAction,
} from "@/app/actions/partners";
import { rupiah } from "@/lib/format";

interface PortalCardsProps {
  partners: Partner[];
}

export function PortalCards({ partners }: PortalCardsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State untuk modal PIN
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  // State untuk modal Atur PIN & Toggle
  const [changePinPartner, setChangePinPartner] = useState<Partner | null>(null);
  const [enablePinToggle, setEnablePinToggle] = useState(true);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changePinError, setChangePinError] = useState("");
  const [changePinSuccess, setChangePinSuccess] = useState("");

  // State untuk modal Tambah Kerjasama
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("Karawang");
  const [newEnablePin, setNewEnablePin] = useState(true);
  const [newPartnerPin, setNewPartnerPin] = useState("1234");
  const [addError, setAddError] = useState("");

  // Handler Buka Dashboard (jika tanpa PIN, langsung login instan)
  const handleOpenDashboard = (partner: Partner) => {
    if (!partner.hasPin) {
      // Bebas akses tanpa PIN
      startTransition(async () => {
        const res = await loginPartnerAction(partner.id);
        if (res?.ok) {
          router.push("/dashboard");
        }
      });
      return;
    }

    // Jika butuh PIN, buka dialog PIN
    setSelectedPartner(partner);
    setPinInput("");
    setPinError("");
  };

  // Handler Submit PIN
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    setPinError("");

    startTransition(async () => {
      const res = await loginPartnerAction(selectedPartner.id, pinInput);
      if (res?.error) {
        setPinError(res.error);
      } else {
        router.push("/dashboard");
      }
    });
  };

  // Handler Simpan Pengaturan PIN (Atur / Ubah / Toggle On-Off)
  const handleSavePinSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePinPartner) return;
    setChangePinError("");
    setChangePinSuccess("");

    if (enablePinToggle) {
      if (newPin !== confirmPin) {
        setChangePinError("Konfirmasi PIN baru tidak sesuai.");
        return;
      }
      if (newPin.length < 4) {
        setChangePinError("PIN baru minimal harus 4 karakter/angka.");
        return;
      }
    }

    startTransition(async () => {
      const res = await updatePartnerPinSettingsAction(changePinPartner.id, {
        enablePin: enablePinToggle,
        oldPin,
        newPin,
      });

      if (res?.error) {
        setChangePinError(res.error);
      } else {
        setChangePinSuccess(res?.message || "Pengaturan PIN berhasil disimpan!");
        setTimeout(() => {
          setChangePinPartner(null);
          setOldPin("");
          setNewPin("");
          setConfirmPin("");
          setChangePinSuccess("");
          router.refresh();
        }, 1200);
      }
    });
  };

  // Handler Tambah Kerjasama Baru
  const handleAddPartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const fd = new FormData();
    fd.append("name", newName);
    fd.append("city", newCity);
    fd.append("enablePin", String(newEnablePin));
    fd.append("pin", newPartnerPin);

    startTransition(async () => {
      const res = await createPartnerAction(fd);
      if (res?.error) {
        setAddError(res.error);
      } else {
        setShowAddPartner(false);
        setNewName("");
        setNewPartnerPin("1234");
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl w-full">
        {partners.map((partner) => {
          const isYogya = partner.name.toUpperCase().includes("YOGYA");
          return (
            <div
              key={partner.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all duration-200"
            >
              {/* Header Card */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                        isYogya
                          ? "bg-amber-500/10 text-amber-700 border border-amber-200/80"
                          : "bg-blue-50 text-blue-700 border border-blue-200/80"
                      }`}
                    >
                      {isYogya ? (
                        <span className="font-black text-sm tracking-wider">YKR</span>
                      ) : (
                        <Building2 className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors">
                        {partner.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {partner.city} · Jawa Barat
                      </p>
                    </div>
                  </div>

                  {/* Status PIN Badge */}
                  {partner.hasPin ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                      title="Dilindungi PIN Keamanan"
                    >
                      <Lock className="h-2.5 w-2.5 text-blue-600" />
                      PIN Aktif
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200"
                      title="Bebas akses tanpa PIN"
                    >
                      <Unlock className="h-2.5 w-2.5 text-emerald-600" />
                      Bebas Akses
                    </span>
                  )}
                </div>

                {/* Info Kerjasama & Penagihan Berkala */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                      Sistem Pembayaran:
                    </span>
                    <span className="font-bold text-indigo-900">Penagihan Berkala</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Order Tercatat:</span>
                    <span className="font-semibold text-slate-800">{partner.orderCount ?? 0} Faktur</span>
                  </div>
                  {(partner.totalUnpaid ?? 0) > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-semibold">
                      <span className="text-slate-600">Sisa Tagihan:</span>
                      <span className="text-amber-700 font-bold">{rupiah(partner.totalUnpaid ?? 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangePinPartner(partner);
                    setEnablePinToggle(partner.hasPin);
                    setOldPin("");
                    setNewPin("");
                    setConfirmPin("");
                    setChangePinError("");
                    setChangePinSuccess("");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                  title="Atur / Aktifkan / Nonaktifkan PIN"
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                  <span>Atur PIN</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDashboard(partner)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {partner.hasPin ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  <span>Buka Dashboard</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Card: + Tambah Kerjasama Baru */}
        <button
          type="button"
          onClick={() => {
            setShowAddPartner(true);
            setNewName("");
            setNewCity("Karawang");
            setNewEnablePin(true);
            setNewPartnerPin("1234");
            setAddError("");
          }}
          className="group relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200 cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-2xs group-hover:scale-110 group-hover:border-blue-300 transition-transform">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-blue-700">
            + Buka Kerjasama Baru
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-[200px] leading-relaxed">
            Daftarkan mitra atau cabang percetakan baru dengan opsi PIN atau bebas akses.
          </p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MASUKKAN PIN UNTUK BUKA DASHBOARD */}
      {/* ========================================================================= */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isPending && setSelectedPartner(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-2xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Masukkan PIN Akses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedPartner.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                disabled={isPending}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              {pinError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PIN Keamanan
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    autoFocus
                    maxLength={10}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Ketik PIN..."
                    className="input text-center font-mono text-lg tracking-widest pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 text-center">
                  PIN diperlukan untuk menjaga privasi tagihan &amp; nota kerjasama.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  disabled={isPending}
                  className="btn text-xs w-1/3"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !pinInput}
                  className="inline-flex w-2/3 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Buka Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ATUR / TOGGLE / UBAH PIN KERJASAMA */}
      {/* ========================================================================= */}
      {changePinPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isPending && setChangePinPartner(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-2xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Pengaturan PIN Akses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{changePinPartner.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePinPartner(null)}
                disabled={isPending}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePinSettings} className="mt-5 space-y-4">
              {changePinError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}
              {changePinSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{changePinSuccess}</span>
                </div>
              )}

              {/* TOGGLE: GUNAKAN PIN ATAU TIDAK */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {enablePinToggle ? (
                      <Shield className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-900">
                      Gunakan PIN Keamanan
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePinToggle}
                      onChange={(e) => setEnablePinToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  {enablePinToggle
                    ? "PIN aktif: siapapun yang membuka dashboard harus memasukkan PIN."
                    : "PIN nonaktif: siapapun dapat langsung membuka dashboard tanpa PIN (Bebas Akses)."}
                </p>
              </div>

              {/* INPUT FIELDS (Hanya tampil jika PIN diaktifkan) */}
              {enablePinToggle && (
                <div className="space-y-3 pt-1">
                  {changePinPartner.hasPin && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        PIN Lama Saat Ini
                      </label>
                      <input
                        type="password"
                        required
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        placeholder="Ketik PIN lama..."
                        className="input text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {changePinPartner.hasPin ? "PIN Baru (Minimal 4 Angka)" : "Tetapkan PIN Baru (Minimal 4 Angka)"}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Ketik PIN..."
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Konfirmasi PIN
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Ulangi PIN..."
                      className="input text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChangePinPartner(null)}
                  disabled={isPending}
                  className="btn text-xs px-3.5 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Pengaturan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH KERJASAMA BARU */}
      {/* ========================================================================= */}
      {showAddPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isPending && setShowAddPartner(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-2xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Buka Kerjasama Baru</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Daftarkan mitra baru dengan dashboard terpisah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartner(false)}
                disabled={isPending}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartnerSubmit} className="mt-5 space-y-4">
              {addError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mitra / Perusahaan Kerjasama
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: YOGYA CIKAMPEK / MATAHARI MALL"
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kota / Wilayah
                </label>
                <input
                  type="text"
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Contoh: Karawang / Purwakarta"
                  className="input text-sm"
                />
              </div>

              {/* TOGGLE GUNAKAN PIN PADA KERJASAMA BARU */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Gunakan PIN Keamanan
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEnablePin}
                      onChange={(e) => setNewEnablePin(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {newEnablePin
                    ? "Mitra akan dilindungi PIN akses."
                    : "Mitra dapat langsung dibuka tanpa PIN."}
                </p>
              </div>

              {newEnablePin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Keamanan Akses (Minimal 4 Angka)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPartnerPin}
                    onChange={(e) => setNewPartnerPin(e.target.value)}
                    placeholder="Ketik PIN awal..."
                    className="input text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartner(false)}
                  disabled={isPending}
                  className="btn text-xs px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newName}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Daftarkan Kerjasama</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
