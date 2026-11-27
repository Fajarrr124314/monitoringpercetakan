-- Data awal (contoh dari nota YOGYA 090926). Silakan ganti dengan daftar harga asli.
insert into public.products (code, name, pricing_unit, unit_label, price)
values ('0200200003', 'FLEXY CHINA', 'm2', 'PCS', 20000)
on conflict (code) do nothing;

insert into public.customers (name, city, province)
select 'YOGYA KARAWANG', 'karawang', 'Jawabarat'
where not exists (select 1 from public.customers where name = 'YOGYA KARAWANG');
