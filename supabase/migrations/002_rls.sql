-- Enable RLS on both tables
alter table menu_items enable row level security;
alter table orders enable row level security;

-- menu_items: public SELECT only, no public write
create policy "anon_read_menu"
  on menu_items for select
  to anon, authenticated
  using (true);

-- orders: public INSERT (customers place orders via API route)
create policy "anon_insert_orders"
  on orders for insert
  to anon, authenticated
  with check (true);

-- orders: public SELECT by order_number (customers check their order)
-- Staff also uses this via the anon Realtime subscription
create policy "anon_read_orders"
  on orders for select
  to anon, authenticated
  using (true);

-- UPDATE and DELETE are NOT granted to anon/authenticated.
-- Staff status changes go through /api/orders/[id] which uses service_role (bypasses RLS).
