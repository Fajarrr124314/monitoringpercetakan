-- =====================================================================
-- 0001_schema.sql  -  Tabel utama Sistem Monitoring Percetakan (Tanpa Login)
-- Semua nominal uang dalam Rupiah (bilangan bulat). Ukuran dalam cm.
-- =====================================================================

create type public.order_status as enum ('draft', 'masuk', 'produksi', 'finishing', 'selesai', 'batal');
create type public.pricing_unit as enum ('m2', 'pcs');

-- Pelanggan ("Kepada" di nota)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text not null default '',
  city text not null default '',
  province text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

-- Daftar harga bahan / produk
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  pricing_unit public.pricing_unit not null default 'm2', -- m2: harga per meter persegi
  unit_label text not null default 'PCS',
  price bigint not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Anggaran per periode (dipantau manager)
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

-- Data usaha untuk kop & kaki nota (selalu 1 baris)
create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Percetakan Sakinah',
  address text not null default 'Jl. Arif Rahman Hakim Niaga, Nagasari Karawang Barat, Karawang',
  phone text not null default '0895626621300',
  email text not null default 'percetakansakinah@gmail.com',
  tagline text not null default 'Smart Shoping for Smart Buyer',
  footer_note text not null default 'Barang yang sudah dibeli tidak dapat dikembalikan tanpa ada perjanjian sebelumnya',
  thanks_note text not null default 'Terima Kasih Banyak Atas Kepercayaannya, Bca.1091937731 a/n.saeful anwar',
  default_tax_percent numeric(5, 2) not null default 0 check (default_tax_percent between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Order cetak = nota (nomor nota = nomor order)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,                                   -- TJ2611-00019, terisi saat order dikirim
  status public.order_status not null default 'draft',
  customer_id uuid not null references public.customers (id),
  title text not null default '',
  order_date timestamptz not null default now(),
  due_at timestamptz,                                     -- estimasi selesai
  notes text not null default '',
  creator_name text not null default 'Designer',          -- nama designer / pembuat
  subtotal bigint not null default 0,                     -- "Total Transaksi"
  discount bigint not null default 0 check (discount >= 0),
  tax_percent numeric(5, 2) not null default 0 check (tax_percent between 0 and 100),
  tax bigint not null default 0,
  other_cost bigint not null default 0 check (other_cost >= 0), -- "Biaya Lain"
  total bigint not null default 0,
  down_payment bigint not null default 0 check (down_payment >= 0),
  cash_paid bigint not null default 0 check (cash_paid >= 0),
  noncash_paid bigint not null default 0 check (noncash_paid >= 0),
  payment_ref text not null default '',
  issued_at timestamptz,                                  -- waktu nota terbit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status);
create index orders_order_date_idx on public.orders (order_date);

-- Rincian item
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  position int not null default 1,
  product_id uuid not null references public.products (id),
  product_code text not null default '',
  product_name text not null default '',
  pricing_unit public.pricing_unit not null default 'm2',
  unit_label text not null default 'PCS',
  description text not null default '',                   -- nama pekerjaan, mis. "VASELINE LUCKY DIP"
  notes text not null default '',
  qty int not null check (qty > 0),
  width_cm int not null default 100 check (width_cm > 0),
  height_cm int not null default 100 check (height_cm > 0),
  list_price bigint not null default 0,
  unit_price bigint not null check (unit_price >= 0),
  design_fee bigint not null default 0 check (design_fee >= 0),
  other_fee bigint not null default 0 check (other_fee >= 0),
  subtotal bigint not null default 0
);
create index order_items_order_idx on public.order_items (order_id, position);

-- Timeline: dibuat, diubah, status, pembayaran, komentar
create table public.order_logs (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  action text not null check (action in ('dibuat', 'diubah', 'status', 'pembayaran', 'komentar')),
  from_status public.order_status,
  to_status public.order_status,
  note text not null default '',
  actor_name text not null default '',
  created_at timestamptz not null default now()
);
create index order_logs_order_idx on public.order_logs (order_id, created_at);

-- Lampiran file desain (isi file di Supabase Storage bucket "order-files")
create table public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  path text not null unique,
  file_name text not null,
  size_bytes bigint not null default 0,
  uploaded_by text not null default '',
  created_at timestamptz not null default now()
);

-- Penghitung nomor order per bulan
create table public.order_counters (
  period text primary key,
  last_no int not null default 0
);
