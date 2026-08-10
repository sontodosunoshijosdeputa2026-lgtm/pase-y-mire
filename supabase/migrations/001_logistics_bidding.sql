-- ============================================================
-- PASE Y MIRE
-- LOGÍSTICA — PUJAS Y DISPONIBILIDAD
-- Migración 001
-- ============================================================

begin;

-- ============================================================
-- 1. DISPONIBILIDAD DE PRESTADORES
-- ============================================================

alter table public.logistics_providers
    add column if not exists availability_status text
        not null default 'available';

alter table public.logistics_providers
    add column if not exists availability_note text
        not null default '';

alter table public.logistics_providers
    add column if not exists available_at timestamptz;

alter table public.logistics_providers
    drop constraint if exists logistics_availability_status_check;

alter table public.logistics_providers
    add constraint logistics_availability_status_check
    check (
        availability_status in (
            'available',
            'in_trip',
            'busy',
            'available_at'
        )
    );

create index if not exists idx_logistics_providers_availability
    on public.logistics_providers(
        availability_status,
        active
    );


-- ============================================================
-- 2. INFORMACIÓN DEL ENVÍO
-- ============================================================

alter table public.service_requests
    add column if not exists package_description text
        not null default '';

alter table public.service_requests
    add column if not exists package_weight numeric(10,2)
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
-- 3. OFERTAS DE PRESTADORES
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
        check (price >= 0),

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

    constraint logistics_offers_provider_request_unique
        unique (request_id, provider_id)
);


-- ============================================================
-- 4. ÍNDICES
-- ============================================================

create index if not exists idx_logistics_offers_request
    on public.logistics_offers(request_id);

create index if not exists idx_logistics_offers_provider
    on public.logistics_offers(provider_id);

create index if not exists idx_logistics_offers_status
    on public.logistics_offers(status);

create index if not exists idx_logistics_offers_created
    on public.logistics_offers(created_at desc);


-- ============================================================
-- 5. SOLO UNA OFERTA ACEPTADA POR SOLICITUD
-- ============================================================

create unique index if not exists idx_one_accepted_logistics_offer
    on public.logistics_offers(request_id)
    where status = 'accepted';


-- ============================================================
-- 6. UPDATED_AT
-- ============================================================

drop trigger if exists logistics_offers_updated_at
on public.logistics_offers;

create trigger logistics_offers_updated_at
before update on public.logistics_offers
for each row
execute function public.set_updated_at();


-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.logistics_offers
enable row level security;


-- ============================================================
-- 8. ACEPTACIÓN ATÓMICA DE UNA OFERTA
--
-- Evita que dos prestadores puedan quedarse
-- simultáneamente con el mismo envío.
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
    v_request public.service_requests;
    v_offer public.logistics_offers;
    v_result public.logistics_offers;
begin

    -- Bloquear la solicitud mientras se decide.
    select *
    into v_request
    from public.service_requests
    where id = p_request_id
    for update;

    if not found then
        raise exception 'Solicitud logística inexistente';
    end if;

    -- La solicitud debe seguir abierta.
    if v_request.status not in ('pending', 'open') then
        raise exception 'La solicitud ya no está disponible';
    end if;

    -- Buscar y bloquear la oferta.
    select *
    into v_offer
    from public.logistics_offers
    where id = p_offer_id
      and request_id = p_request_id
      and provider_id = p_provider_id
    for update;

    if not found then
        raise exception 'Oferta logística inexistente';
    end if;

    if v_offer.status <> 'pending' then
        raise exception 'La oferta ya no está disponible';
    end if;

    -- Aceptar la oferta elegida.
    update public.logistics_offers
    set
        status = 'accepted',
        updated_at = now()
    where id = p_offer_id
    returning *
    into v_result;

    -- Rechazar las demás ofertas.
    update public.logistics_offers
    set
        status = 'rejected',
        updated_at = now()
    where request_id = p_request_id
      and id <> p_offer_id
      and status = 'pending';

    -- Asociar el prestador elegido a la solicitud.
    update public.service_requests
    set
        provider_id = p_provider_id,
        price = v_offer.price,
        status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    where id = p_request_id;

    -- El prestador deja de aparecer como disponible
    -- para nuevas solicitudes mientras realiza este servicio.
    update public.logistics_providers
    set
        availability_status = 'in_trip',
        availability_note = 'Prestando servicio',
        available_at = null,
        active = true,
        updated_at = now()
    where id = p_provider_id;

    return v_result;
end;
$$;


-- ============================================================
-- 9. FUNCIÓN PARA CANCELAR UNA OFERTA
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
    v_result public.logistics_offers;
begin

    update public.logistics_offers
    set
        status = 'withdrawn',
        updated_at = now()
    where id = p_offer_id
      and provider_id = p_provider_id
      and status = 'pending'
    returning *
    into v_result;

    if not found then
        raise exception 'No se pudo retirar la oferta';
    end if;

    return v_result;
end;
$$;


-- ============================================================
-- 10. PERMISOS PARA EL BACKEND
-- ============================================================

grant execute on function public.accept_logistics_offer(
    uuid,
    uuid,
    uuid
) to service_role;

grant execute on function public.withdraw_logistics_offer(
    uuid,
    uuid
) to service_role;


commit;
