-- Dashboard Black Friday: produtos, links por loja e histórico de preços.
-- Cada usuário só enxerga os próprios dados (RLS). O coletor grava com a service role.

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  target_price numeric(12, 2) check (target_price is null or target_price > 0),
  notes        text,
  created_at   timestamptz not null default now()
);

create index products_user_id_idx on public.products (user_id);

create table public.product_links (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  url             text not null check (url ~* '^https?://'),
  store           text not null,
  last_price      numeric(12, 2),
  last_in_stock   boolean,
  last_checked_at timestamptz,
  last_status     text check (last_status in ('ok', 'error')),
  last_error      text,
  created_at      timestamptz not null default now(),
  unique (product_id, url)
);

create index product_links_product_id_idx on public.product_links (product_id);

create table public.price_snapshots (
  id          bigint generated always as identity primary key,
  link_id     uuid not null references public.product_links (id) on delete cascade,
  price       numeric(12, 2) not null check (price > 0),
  in_stock    boolean not null default true,
  captured_at timestamptz not null default now()
);

create index price_snapshots_link_captured_idx on public.price_snapshots (link_id, captured_at);

-- RLS ---------------------------------------------------------------------

alter table public.products        enable row level security;
alter table public.product_links   enable row level security;
alter table public.price_snapshots enable row level security;

create policy "products: dono lê"     on public.products for select using (user_id = auth.uid());
create policy "products: dono cria"   on public.products for insert with check (user_id = auth.uid());
create policy "products: dono edita"  on public.products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "products: dono apaga"  on public.products for delete using (user_id = auth.uid());

create policy "links: dono lê" on public.product_links for select
  using (exists (select 1 from public.products p where p.id = product_id and p.user_id = auth.uid()));
create policy "links: dono cria" on public.product_links for insert
  with check (exists (select 1 from public.products p where p.id = product_id and p.user_id = auth.uid()));
create policy "links: dono edita" on public.product_links for update
  using (exists (select 1 from public.products p where p.id = product_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.user_id = auth.uid()));
create policy "links: dono apaga" on public.product_links for delete
  using (exists (select 1 from public.products p where p.id = product_id and p.user_id = auth.uid()));

-- Snapshots: usuário só lê; quem grava é o coletor (service role ignora RLS).
create policy "snapshots: dono lê" on public.price_snapshots for select
  using (exists (
    select 1 from public.product_links l
    join public.products p on p.id = l.product_id
    where l.id = link_id and p.user_id = auth.uid()
  ));

-- Os campos last_* são do coletor: o usuário pode mudar url/store, mas não forjar preço.
revoke update on public.product_links from authenticated;
grant update (url, store) on public.product_links to authenticated;
revoke insert on public.product_links from authenticated;
grant insert (product_id, url, store) on public.product_links to authenticated;
