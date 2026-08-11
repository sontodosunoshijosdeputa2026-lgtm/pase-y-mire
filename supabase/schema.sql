-- ============================================================
-- LOGISTICS EXTENSION
-- ============================================================

-- Campos adicionales del prestador
alter table public.logistics_providers
    add column if not exists availability_status text
        not null default 'available';

alter table public.logistics_providers
    add column if not exists availability_note text
        default '';

alter table public.logistics_providers
    add column if not exists available_at timestamptz;


-- Campos adicionales de solicitudes logísticas
alter table public.service_requests
    add column if not exists package_description text
        not null default '';

alter table public.service_requests
    add column if not exists package_weight numeric
        not null default 0;

alter table public.service_requests
    add column if not exists package_dimensions text
        not null default '';

alter table public.service_requests
    add column if not exists requester_note text
        not null default '';

alter table public.service_requests
    add column if not exists requested_date timestamptz;

alter table public.service_requests
    add column if not exists accepted_at timestamptz;

alter table public.service_requests
    add column if not exists completed_at timestamptz;


-- ============================================================
-- LOGISTICS OFFERS
-- ============================================================

create table if not exists public.logistics_offers (
    id uuid primary key default gen_random_uuid(),

    request_id uuid not null
        references public.service_requests(id)
        on delete cascade,

    provider_id uuid not null
        references public.logistics_providers(id)
        on delete cascade,

    price numeric(14,2) not null,

    message text not null default '',

    estimated_minutes integer,

    status text not null default 'pending',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint logistics_offers_price_check
        check (price > 0),

    constraint logistics_offers_estimated_minutes_check
        check (
            estimated_minutes is null
            or estimated_minutes > 0
        ),

    constraint logistics_offers_status_check
        check (
            status in (
                'pending',
                'accepted',
                'rejected',
                'withdrawn'
            )
        ),

    constraint logistics_offers_unique_provider_request
        unique (request_id, provider_id)
);


-- ============================================================
-- ÍNDICES LOGÍSTICOS
-- ============================================================

create index if not exists
    idx_logistics_providers_service_type
    on public.logistics_providers(service_type);

create index if not exists
    idx_logistics_providers_active
    on public.logistics_providers(active);

create index if not exists
    idx_logistics_providers_availability
    on public.logistics_providers(availability_status);

create index if not exists
    idx_service_requests_status
    on public.service_requests(status);

create index if not exists
    idx_service_requests_service_type
    on public.service_requests(service_type);

create index if not exists
    idx_service_requests_requested_date
    on public.service_requests(requested_date);

create index if not exists
    idx_logistics_offers_request
    on public.logistics_offers(request_id);

create index if not exists
    idx_logistics_offers_provider
    on public.logistics_offers(provider_id);

create index if not exists
    idx_logistics_offers_status
    on public.logistics_offers(status);

create index if not exists
    idx_logistics_offers_created
    on public.logistics_offers(created_at desc);


-- ============================================================
-- TRIGGER UPDATED_AT — OFFERS
-- ============================================================

drop trigger if exists logistics_offers_updated_at
on public.logistics_offers;

create trigger logistics_offers_updated_at
before update on public.logistics_offers
for each row
execute function public.set_updated_at();


-- ============================================================
-- RPC: ACCEPT LOGISTICS OFFER
-- ============================================================

create or replace function public.accept_logistics_offer(
    p_request_id uuid,
    p_offer_id uuid,
    p_provider_id uuid
)
returns public.logistics_offers
language plpgsql
security definer
set search_path = public
as $$
declare
    selected_offer public.logistics_offers;
begin

    select *
    into selected_offer
    from public.logistics_offers
    where id = p_offer_id
      and request_id = p_request_id
      and provider_id = p_provider_id
      and status = 'pending'
    for update;

    if not found then
        raise exception
            using
                errcode = 'P0001',
                message = 'La oferta ya no está disponible';
    end if;


    update public.service_requests
    set
        provider_id = p_provider_id,
        price = selected_offer.price,
        status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    where id = p_request_id
      and status in ('pending', 'open')
      and provider_id is null;

    if not found then
        raise exception
            using
                errcode = 'P0001',
                message = 'La solicitud ya no está disponible';
    end if;


    update public.logistics_offers
    set
        status = 'accepted',
        updated_at = now()
    where id = p_offer_id
    returning *
    into selected_offer;


    update public.logistics_offers
    set
        status = 'rejected',
        updated_at = now()
    where request_id = p_request_id
      and id <> p_offer_id
      and status = 'pending';


    return selected_offer;
end;
$$;


-- ============================================================
-- RPC: WITHDRAW LOGISTICS OFFER
-- ============================================================

create or replace function public.withdraw_logistics_offer(
    p_offer_id uuid,
    p_provider_id uuid
)
returns public.logistics_offers
language plpgsql
security definer
set search_path = public
as $$
declare
    selected_offer public.logistics_offers;
begin

    update public.logistics_offers
    set
        status = 'withdrawn',
        updated_at = now()
    where id = p_offer_id
      and provider_id = p_provider_id
      and status = 'pending'
    returning *
    into selected_offer;

    if not found then
        raise exception
            using
                errcode = 'P0001',
                message = 'La oferta no puede ser retirada';
    end if;

    return selected_offer;
end;
$$;


-- ============================================================
-- RLS
-- ============================================================

alter table public.logistics_offers
enable row level security;


-- ============================================================
-- FIN EXTENSIÓN LOGÍSTICA
-- ============================================================
