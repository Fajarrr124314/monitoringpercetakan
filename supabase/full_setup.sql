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
-- =====================================================================
-- 0002_functions.sql - Rumus harga, nomor nota, dan aksi order (RPC)
-- Tanpa login: semua fungsi dapat diakses oleh anon & authenticated
-- =====================================================================

-- RUMUS (harus sama dengan src/lib/pricing.ts)
create or replace function public.calc_item_subtotal(
  p_unit public.pricing_unit, p_qty int, p_width_cm int, p_height_cm int,
  p_unit_price bigint, p_design_fee bigint, p_other_fee bigint
) returns bigint language sql immutable as $$
  select (case when p_unit = 'm2'
      then round(p_qty::numeric * p_width_cm * p_height_cm * p_unit_price / 10000)
      else p_qty::numeric * p_unit_price
    end)::bigint + p_design_fee + p_other_fee
$$;

create or replace function public.calc_tax(p_base bigint, p_percent numeric) returns bigint
language sql immutable as $$
  select round(greatest(p_base, 0) * p_percent / 100)::bigint
$$;

-- Nomor nota: TJ + YYMM + urutan 5 digit per bulan, contoh TJ2611-00019
create or replace function public.next_order_no(p_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_period text := to_char(p_at at time zone 'Asia/Jakarta', 'YYMM');
  v_no int;
begin
  insert into public.order_counters (period, last_no) values (v_period, 1)
  on conflict (period) do update set last_no = public.order_counters.last_no + 1
  returning last_no into v_no;
  return 'TJ' || v_period || '-' || lpad(v_no::text, 5, '0');
end $$;

-- Hitung ulang total order dari item-itemnya
create or replace function public.recalc_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_sub bigint;
  v_tax bigint;
begin
  select * into o from public.orders where id = p_order_id;
  select coalesce(sum(subtotal), 0) into v_sub from public.order_items where order_id = p_order_id;
  if o.discount > v_sub then
    raise exception 'Diskon tidak boleh melebihi total transaksi';
  end if;
  v_tax := public.calc_tax(v_sub - o.discount, o.tax_percent);
  if o.down_payment + o.cash_paid + o.noncash_paid > v_sub - o.discount + v_tax + o.other_cost then
    raise exception 'Total baru lebih kecil dari pembayaran yang sudah dicatat';
  end if;
  update public.orders
     set subtotal = v_sub,
         tax = v_tax,
         total = v_sub - o.discount + v_tax + o.other_cost,
         updated_at = now()
   where id = p_order_id;
end $$;

-- Ubah status order + catat di timeline
create or replace function public.set_order_status(
  p_order_id uuid, p_status public.order_status, p_note text default '', p_actor text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_ok boolean;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order tidak ditemukan';
  end if;

  v_ok := case o.status
    when 'draft' then p_status in ('masuk', 'batal')
    when 'masuk' then p_status in ('produksi', 'batal')
    when 'produksi' then p_status in ('finishing', 'selesai')
    when 'finishing' then p_status = 'selesai'
    else false
  end;
  if not v_ok then
    raise exception 'Status tidak bisa diubah dari % ke %', o.status, p_status;
  end if;

  if p_status = 'masuk' then
    if not exists (select 1 from public.order_items where order_id = o.id) then
      raise exception 'Order minimal berisi 1 item';
    end if;
    update public.orders
       set status = 'masuk',
           order_no = coalesce(order_no, public.next_order_no(now())),
           issued_at = coalesce(issued_at, now()),
           updated_at = now()
     where id = o.id;
  else
    update public.orders set status = p_status, updated_at = now() where id = o.id;
  end if;

  insert into public.order_logs (order_id, action, from_status, to_status, note, actor_name)
  values (o.id, 'status', o.status, p_status, coalesce(p_note, ''), coalesce(p_actor, ''));
end $$;

-- Simpan order (baru / edit) beserta item-nya dalam satu transaksi
create or replace function public.save_order(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_tax_default numeric;
  o public.orders;
  it jsonb;
  pr public.products;
  v_pos int := 0;
  v_qty int; v_w int; v_h int;
  v_price bigint; v_design bigint; v_other bigint;
  v_creator text := coalesce(nullif(trim(p ->> 'creator_name'), ''), 'Designer');
begin
  if nullif(p ->> 'customer_id', '') is null then raise exception 'Pelanggan wajib dipilih'; end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'Order minimal berisi 1 item';
  end if;
  select default_tax_percent into v_tax_default from public.settings where id = 1;

  if v_id is null then
    insert into public.orders (
      customer_id, title, order_date, due_at, notes, creator_name,
      discount, tax_percent, other_cost
    ) values (
      (p ->> 'customer_id')::uuid,
      coalesce(p ->> 'title', ''),
      coalesce(nullif(p ->> 'order_date', '')::timestamptz, now()),
      nullif(p ->> 'due_at', '')::timestamptz,
      coalesce(p ->> 'notes', ''),
      v_creator,
      coalesce(nullif(p ->> 'discount', '')::bigint, 0),
      coalesce(nullif(p ->> 'tax_percent', '')::numeric, v_tax_default),
      coalesce(nullif(p ->> 'other_cost', '')::bigint, 0)
    )
    returning * into o;
    insert into public.order_logs (order_id, action, actor_name) values (o.id, 'dibuat', v_creator);
  else
    select * into o from public.orders where id = v_id for update;
    if not found then
      raise exception 'Order tidak ditemukan';
    end if;
    if o.status not in ('draft', 'masuk') then
      raise exception 'Order sudah masuk produksi dan tidak bisa diubah';
    end if;
    update public.orders set
      customer_id = (p ->> 'customer_id')::uuid,
      title = coalesce(p ->> 'title', ''),
      order_date = coalesce(nullif(p ->> 'order_date', '')::timestamptz, o.order_date),
      due_at = nullif(p ->> 'due_at', '')::timestamptz,
      notes = coalesce(p ->> 'notes', ''),
      creator_name = v_creator,
      discount = coalesce(nullif(p ->> 'discount', '')::bigint, o.discount),
      tax_percent = coalesce(nullif(p ->> 'tax_percent', '')::numeric, o.tax_percent),
      other_cost = coalesce(nullif(p ->> 'other_cost', '')::bigint, o.other_cost)
    where id = o.id;
    delete from public.order_items where order_id = o.id;
    insert into public.order_logs (order_id, action, actor_name) values (o.id, 'diubah', v_creator);
  end if;

  for it in select value from jsonb_array_elements(p -> 'items') loop
    v_pos := v_pos + 1;
    select * into pr from public.products where id = nullif(it ->> 'product_id', '')::uuid;
    if not found then raise exception 'Bahan pada item % belum dipilih', v_pos; end if;
    v_qty := coalesce(nullif(it ->> 'qty', '')::int, 0);
    v_w := coalesce(nullif(it ->> 'width_cm', '')::int, 100);
    v_h := coalesce(nullif(it ->> 'height_cm', '')::int, 100);
    if v_qty <= 0 or v_w <= 0 or v_h <= 0 then
      raise exception 'Jumlah dan ukuran item % harus lebih dari 0', v_pos;
    end if;
    v_price := coalesce(nullif(it ->> 'unit_price', '')::bigint, pr.price);
    v_design := coalesce(nullif(it ->> 'design_fee', '')::bigint, 0);
    v_other := coalesce(nullif(it ->> 'other_fee', '')::bigint, 0);
    if v_price < 0 or v_design < 0 or v_other < 0 then
      raise exception 'Nominal pada item % tidak boleh negatif', v_pos;
    end if;

    insert into public.order_items (
      order_id, position, product_id, product_code, product_name, pricing_unit, unit_label,
      description, notes, qty, width_cm, height_cm, list_price, unit_price, design_fee, other_fee, subtotal
    ) values (
      o.id, v_pos, pr.id, pr.code, pr.name, pr.pricing_unit, pr.unit_label,
      coalesce(it ->> 'description', ''), coalesce(it ->> 'notes', ''),
      v_qty, v_w, v_h, pr.price, v_price, v_design, v_other,
      public.calc_item_subtotal(pr.pricing_unit, v_qty, v_w, v_h, v_price, v_design, v_other)
    );
  end loop;

  perform public.recalc_order(o.id);

  if coalesce((p ->> 'submit')::boolean, false) and o.status = 'draft' then
    perform public.set_order_status(o.id, 'masuk', '', v_creator);
  end if;
  return o.id;
end $$;

-- Catat pembayaran
create or replace function public.record_payment(
  p_order_id uuid, p_down_payment bigint, p_cash bigint, p_noncash bigint,
  p_ref text default '', p_note text default '', p_actor text default ''
) returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order tidak ditemukan'; end if;
  if o.status in ('draft', 'batal') then
    raise exception 'Pembayaran hanya untuk order yang notanya sudah terbit';
  end if;
  if least(p_down_payment, p_cash, p_noncash) < 0 then
    raise exception 'Nominal pembayaran tidak boleh negatif';
  end if;
  if p_down_payment + p_cash + p_noncash > o.total then
    raise exception 'Total pembayaran melebihi total nota';
  end if;
  update public.orders
     set down_payment = p_down_payment, cash_paid = p_cash, noncash_paid = p_noncash,
         payment_ref = coalesce(p_ref, ''), updated_at = now()
   where id = o.id;
  insert into public.order_logs (order_id, action, note, actor_name)
  values (o.id, 'pembayaran', concat_ws(' - ',
    'Dibayar ' || to_char(p_down_payment + p_cash + p_noncash, 'FM999,999,999,990')
      || ' dari ' || to_char(o.total, 'FM999,999,999,990'),
    nullif(trim(coalesce(p_note, '')), '')), coalesce(p_actor, ''));
end $$;

-- Komentar di timeline order
create or replace function public.add_comment(p_order_id uuid, p_note text, p_actor text default '') returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'Order tidak ditemukan'; end if;
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Komentar kosong'; end if;
  insert into public.order_logs (order_id, action, note, actor_name)
  values (o.id, 'komentar', trim(p_note), coalesce(p_actor, ''));
end $$;

-- Pemakaian anggaran
create or replace function public.budget_usage()
returns table (id uuid, name text, period_start date, period_end date, amount bigint, used bigint, order_count bigint)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.period_start, b.period_end, b.amount,
         coalesce(sum(o.total), 0)::bigint, count(o.id)
    from public.budgets b
    left join public.orders o
      on o.status not in ('draft', 'batal')
     and (o.order_date at time zone 'Asia/Jakarta')::date between b.period_start and b.period_end
   group by b.id
   order by b.period_start desc
$$;

-- Izin eksekusi untuk publik (anon) dan authenticated
grant execute on function
  public.calc_item_subtotal(public.pricing_unit, int, int, int, bigint, bigint, bigint),
  public.calc_tax(bigint, numeric),
  public.set_order_status(uuid, public.order_status, text, text),
  public.save_order(jsonb),
  public.record_payment(uuid, bigint, bigint, bigint, text, text, text),
  public.add_comment(uuid, text, text),
  public.budget_usage()
to anon, authenticated;
-- =====================================================================
-- 0003_rls.sql - Row Level Security (Tanpa Login: Bebas Baca/Tulis)
-- Semua data dapat dibaca dan diubah langsung oleh anon dan authenticated.
-- =====================================================================

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.budgets enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_logs enable row level security;
alter table public.order_files enable row level security;

-- Customers
create policy "customers_all" on public.customers for all to anon, authenticated using (true) with check (true);

-- Products
create policy "products_all" on public.products for all to anon, authenticated using (true) with check (true);

-- Budgets
create policy "budgets_all" on public.budgets for all to anon, authenticated using (true) with check (true);

-- Settings
create policy "settings_all" on public.settings for all to anon, authenticated using (true) with check (true);

-- Orders
create policy "orders_all" on public.orders for all to anon, authenticated using (true) with check (true);

-- Order Items
create policy "order_items_all" on public.order_items for all to anon, authenticated using (true) with check (true);

-- Order Logs
create policy "order_logs_all" on public.order_logs for all to anon, authenticated using (true) with check (true);

-- Order Files
create policy "order_files_all" on public.order_files for all to anon, authenticated using (true) with check (true);
-- =====================================================================
-- 0004_storage_realtime.sql - Bucket file desain & update realtime (Tanpa Login)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('order-files', 'order-files', true)
on conflict (id) do update set public = true;

create policy "order_files_storage_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'order-files')
  with check (bucket_id = 'order-files');

-- Kirim perubahan order & timeline ke browser secara realtime
alter publication supabase_realtime add table public.orders, public.order_logs;
-- Data awal (contoh dari nota YOGYA 090926). Silakan ganti dengan daftar harga asli.
insert into public.products (code, name, pricing_unit, unit_label, price)
values ('0200200003', 'FLEXY CHINA', 'm2', 'PCS', 20000)
on conflict (code) do nothing;

insert into public.customers (name, city, province)
select 'YOGYA KARAWANG', 'karawang', 'Jawabarat'
where not exists (select 1 from public.customers where name = 'YOGYA KARAWANG');
