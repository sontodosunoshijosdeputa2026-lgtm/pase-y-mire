-- =========================================================
-- PASE Y MIRE
-- ESQUEMA PRINCIPAL SUPABASE
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- USERS
-- =========================================================

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    email text not null unique,

    password text not null,

    phone text default '',

    id_number text default '',

    avatar text,

    verified boolean not null default false,

    logistics_provider boolean not null default false,

    provider_service text,

    provider_verified boolean not null default false,

    provider_paid boolean not null default false,

    rating numeric(3,2) not null default 5.00,

    posts integer not null default 0,

    sales integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint users_rating_check
        check (rating >= 0 and rating <= 5)
);


-- =========================================================
-- PRODUCTS
-- =========================================================

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),

    seller_id uuid not null
        references public.users(id)
        on delete cascade,

    title text not null,

    description text not null default '',

    price numeric(14,2) not null,

    category text not null default 'otros',

    condition text not null default 'usado',

    images jsonb not null default '[]'::jsonb,

    reels jsonb not null default '[]'::jsonb,

    city text,

    province text,

    latitude numeric,

    longitude numeric,

    status text not null default 'activo',

    views integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint products_price_check
        check (price >= 0)
);


-- =========================================================
-- PRODUCT LIKES
-- =========================================================

create table if not exists public.product_likes (
    product_id uuid not null
        references public.products(id)
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    primary key (product_id, user_id)
);


-- =========================================================
-- ORDERS
-- =========================================================

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),

    buyer_id uuid not null
        references public.users(id),

    seller_id uuid not null
        references public.users(id),

    product_id uuid
        references public.products(id),

    amount numeric(14,2) not null,

    platform_fee numeric(14,2) not null default 0,

    status text not null default 'pending',

    payment_id text,

    payment_status text default 'pending',

    shipping_status text default 'pending',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint orders_amount_check
        check (amount >= 0),

    constraint orders_platform_fee_check
        check (platform_fee >= 0)
);


-- =========================================================
-- WALLETS
-- =========================================================

create table if not exists public.wallets (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique
        references public.users(id)
        on delete cascade,

    balance numeric(14,2) not null default 0,

    card_number text unique,

    card_last4 text,

    card_holder text,

    card_expiry text,

    card_active boolean not null default true,

    qr_token text unique,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint wallets_balance_check
        check (balance >= 0)
);


-- =========================================================
-- TRANSACTIONS
-- =========================================================

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    type text not null,

    amount numeric(14,2) not null,

    currency text not null default 'ARS',

    status text not null default 'pending',

    reference_type text,

    reference_id uuid,

    description text,

    created_at timestamptz not null default now()
);


-- =========================================================
-- LOGISTICS PROVIDERS
-- =========================================================

create table if not exists public.logistics_providers (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique
        references public.users(id)
        on delete cascade,

    service_type text not null,

    verified boolean not null default false,

    active boolean not null default false,

    rating numeric(3,2) not null default 5.00,

    latitude numeric,

    longitude numeric,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint logistics_rating_check
        check (rating >= 0 and rating <= 5)
);


-- =========================================================
-- SERVICE REQUESTS
-- =========================================================

create table if not exists public.service_requests (
    id uuid primary key default gen_random_uuid(),

    requester_id uuid not null
        references public.users(id)
        on delete cascade,

    provider_id uuid
        references public.logistics_providers(id),

    service_type text not null,

    origin text,

    destination text,

    origin_lat numeric,

    origin_lng numeric,

    destination_lat numeric,

    destination_lng numeric,

    price numeric(14,2) not null default 0,

    platform_fee numeric(14,2) not null default 0,

    status text not null default 'pending',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint service_requests_price_check
        check (price >= 0)
);


-- =========================================================
-- CONVERSATIONS
-- =========================================================

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),

    created_at timestamptz not null default now()
);


-- =========================================================
-- CONVERSATION MEMBERS
-- =========================================================

create table if not exists public.conversation_members (
    conversation_id uuid not null
        references public.conversations(id)
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    primary key (conversation_id, user_id)
);


-- =========================================================
-- MESSAGES
-- =========================================================

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on delete cascade,

    sender_id uuid not null
        references public.users(id)
        on delete cascade,

    body text not null,

    read_at timestamptz,

    created_at timestamptz not null default now()
);


-- =========================================================
-- NOTIFICATIONS
-- =========================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    type text,

    title text,

    body text,

    data jsonb not null default '{}'::jsonb,

    read boolean not null default false,

    created_at timestamptz not null default now()
);


-- =========================================================
-- ADVERTISEMENTS
-- =========================================================

create table if not exists public.advertisements (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid
        references public.users(id)
        on delete set null,

    title text not null,

    image_url text,

    target_url text not null,

    impressions_limit integer not null default 1000,

    impressions integer not null default 0,

    price numeric(14,2) not null default 0,

    status text not null default 'pending',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_users_email
    on public.users(email);

create index if not exists idx_products_seller
    on public.products(seller_id);

create index if not exists idx_products_category
    on public.products(category);

create index if not exists idx_products_status
    on public.products(status);

create index if not exists idx_products_created
    on public.products(created_at desc);

create index if not exists idx_product_likes_user
    on public.product_likes(user_id);

create index if not exists idx_orders_buyer
    on public.orders(buyer_id);

create index if not exists idx_orders_seller
    on public.orders(seller_id);

create index if not exists idx_orders_product
    on public.orders(product_id);

create index if not exists idx_transactions_user
    on public.transactions(user_id);

create index if not exists idx_transactions_created
    on public.transactions(created_at desc);

create index if not exists idx_service_requests_requester
    on public.service_requests(requester_id);

create index if not exists idx_service_requests_provider
    on public.service_requests(provider_id);

create index if not exists idx_messages_conversation
    on public.messages(conversation_id);

create index if not exists idx_messages_created
    on public.messages(created_at);

create index if not exists idx_notifications_user
    on public.notifications(user_id);

create index if not exists idx_notifications_unread
    on public.notifications(user_id, read);


-- =========================================================
-- UPDATED_AT
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists users_updated_at
on public.users;

create trigger users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


drop trigger if exists products_updated_at
on public.products;

create trigger products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();


drop trigger if exists orders_updated_at
on public.orders;

create trigger orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();


drop trigger if exists wallets_updated_at
on public.wallets;

create trigger wallets_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();


drop trigger if exists logistics_providers_updated_at
on public.logistics_providers;

create trigger logistics_providers_updated_at
before update on public.logistics_providers
for each row
execute function public.set_updated_at();


drop trigger if exists service_requests_updated_at
on public.service_requests;

create trigger service_requests_updated_at
before update on public.service_requests
for each row
execute function public.set_updated_at();


drop trigger if exists advertisements_updated_at
on public.advertisements;

create trigger advertisements_updated_at
before update on public.advertisements
for each row
execute function public.set_updated_at();


-- =========================================================
-- FUNCIÓN PARA CREAR WALLET AUTOMÁTICAMENTE
-- =========================================================

create or replace function public.create_wallet_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.wallets (
        user_id,
        balance,
        card_holder
    )
    values (
        new.id,
        0,
        new.name
    )
    on conflict (user_id) do nothing;

    return new;

end;
$$;


drop trigger if exists create_wallet_after_user
on public.users;

create trigger create_wallet_after_user
after insert on public.users
for each row
execute function public.create_wallet_for_user();


-- =========================================================
-- SEGURIDAD
-- =========================================================
--
-- El backend utiliza SUPABASE_KEY desde el servidor.
-- Esa variable debe contener la clave server-side
-- correspondiente al proyecto Supabase.
--
-- Activamos RLS para evitar acceso público directo.
-- El service_role de Supabase bypassa RLS.
--

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.product_likes enable row level security;
alter table public.orders enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.logistics_providers enable row level security;
alter table public.service_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.advertisements enable row level security;


-- =========================================================
-- FIN
-- =========================================================
