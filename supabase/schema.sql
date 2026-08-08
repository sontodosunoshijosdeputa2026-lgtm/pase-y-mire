create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  phone text default '',
  id_number text default '',
  avatar text,
  verified boolean default false,
  logistics_provider boolean default false,
  provider_service text,
  provider_verified boolean default false,
  provider_paid boolean default false,
  rating numeric(3,2) default 5.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id),
  title text not null,
  description text default '',
  price numeric(14,2) not null check (price >= 0),
  category text default 'otros',
  condition text default 'usado',
  images jsonb default '[]'::jsonb,
  reels jsonb default '[]'::jsonb,
  city text,
  province text,
  latitude numeric,
  longitude numeric,
  status text default 'activo',
  views integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id),
  balance numeric(14,2) default 0 check (balance >= 0),
  card_id text unique,
  card_last4 text,
  card_holder text,
  card_expiry text,
  card_active boolean default true,
  qr_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type text not null,
  amount numeric(14,2) not null,
  currency text default 'ARS',
  status text default 'pending',
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  product_id uuid references public.products(id),
  amount numeric(14,2) not null,
  platform_fee numeric(14,2) default 0,
  status text default 'pending',
  payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.logistics_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id),
  service_type text not null,
  verified boolean default false,
  active boolean default false,
  rating numeric(3,2) default 5.00,
  latitude numeric,
  longitude numeric,
  created_at timestamptz default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id),
  provider_id uuid references public.logistics_providers(id),
  service_type text not null,
  origin text,
  destination text,
  origin_lat numeric,
  origin_lng numeric,
  destination_lat numeric,
  destination_lng numeric,
  price numeric(14,2) not null,
  platform_fee numeric(14,2) default 0,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type text,
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id),
  title text not null,
  image_url text,
  target_url text not null,
  impressions_limit integer default 1000,
  impressions integer default 0,
  price_usd numeric(10,2) default 10.00,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists products_seller_idx
  on public.products(seller_id);

create index if not exists products_category_idx
  on public.products(category);

create index if not exists products_status_idx
  on public.products(status);

create index if not exists transactions_user_idx
  on public.transactions(user_id);

create index if not exists orders_buyer_idx
  on public.orders(buyer_id);

create index if not exists orders_seller_idx
  on public.orders(seller_id);

create index if not exists messages_conversation_idx
  on public.messages(conversation_id);
