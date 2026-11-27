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
