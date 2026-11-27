# Panduan Setup & Deploy ke Vercel + Domain Sendiri (Tanpa Login)

Sistem ini dirancang langsung terbuka (**tanpa login/password**). Siapa pun yang membuka aplikasi langsung bisa menginput order, melihat antrian cetak, mencatat pembayaran, dan mencetak nota.

---

## 1. Buat Project di Supabase

1. Buka [database.new](https://database.new) dan buat project baru.
2. Buka **SQL Editor** di Supabase Dashboard, lalu jalankan file migrasi berikut **secara berurutan**:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_storage_realtime.sql`
   - (Opsional) `supabase/seed.sql` untuk data contoh FLEXY CHINA & YOGYA KARAWANG
3. Buka **Project Settings > API**, salin:
   - **Project URL**
   - **anon / publishable key**

> Tidak perlu mengatur pengguna/email/password di Supabase Auth karena sistem login sudah ditiadakan.

---

## 2. Deploy ke Vercel

1. Push kode ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: sistem monitoring percetakan"
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. Buka [vercel.com/new](https://vercel.com/new), pilih repositori Anda.
3. Di bagian **Environment Variables**, isi:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = anon / publishable key
4. Klik **Deploy**.

---

## 3. Hubungkan Domain Sendiri di Vercel

1. Di Vercel Dashboard, buka **Project > Settings > Domains**.
2. Masukkan domain/subdomain Anda, misalnya:
   - Subdomain: `app.domainanda.com` (disarankan)
   - Domain utama: `domainanda.com`
3. Vercel akan menampilkan DNS record yang harus disetel di tempat Anda membeli domain:
   - Untuk **subdomain** (`app.domainanda.com`): buat record **CNAME** dengan nama `app` mengarah ke `cname.vercel-dns.com`.
   - Untuk **domain utama** (`domainanda.com`): buat record **A** mengarah ke `76.76.21.21`.
4. Tunggu beberapa menit sampai status di Vercel menjadi **Valid Configuration** (centang hijau). SSL aktif otomatis.

---

## 4. Menjalankan di Lokal (Development)

1. Pastikan file `.env.local` sudah berisi:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ey...
   ```
2. Jalankan:
   ```bash
   npm run dev
   ```
3. Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 5. Mengganti Logo Nota

Jika ingin mengganti gambar logo nota:
```bash
npm run logo -- path/ke/logo-baru.jpg
```
Lalu commit dan push ke GitHub (Vercel akan otomatis build ulang).
