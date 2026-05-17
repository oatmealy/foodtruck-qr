-- menu_items
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  price numeric not null,
  image_url text,
  available boolean default true,
  created_at timestamptz default now()
);

-- orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null,
  items jsonb not null,
  status text default 'pending' check (status in ('pending','preparing','ready')),
  total numeric not null,
  created_at timestamptz default now()
);

-- daily order number sequence
create sequence daily_order_seq;

-- helper so API routes can call nextval without raw SQL
create or replace function next_order_number()
returns integer
language sql
security definer
as $$
  select nextval('daily_order_seq')::integer;
$$;

grant execute on function next_order_number to service_role, anon, authenticated;
