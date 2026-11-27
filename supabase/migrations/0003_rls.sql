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
