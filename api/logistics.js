const supabase = require('../utils/supabase');

const OPEN_REQUEST_STATUSES = ['pending', 'open'];
const OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

const PROVIDER_AVAILABILITY = [
  'available',
  'in_trip',
  'busy',
  'available_at'
];

function normalizeString(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function parsePositiveNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

// ============================================================
// PRESTADOR
// ============================================================

async function getProviderByUserId(userId) {
  const { data, error } = await supabase
    .from('logistics_providers')
    .select(`
      id,
      user_id,
      service_type,
      verified,
      active,
      rating,
      latitude,
      longitude,
      availability_status,
      availability_note,
      available_at,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo prestador: ${error.message}`);
  }

  return data;
}

async function requireProvider(userId) {
  const provider = await getProviderByUserId(userId);

  if (!provider) {
    const error = new Error(
      'El usuario no está registrado como prestador de logística'
    );

    error.statusCode = 403;

    throw error;
  }

  if (!provider.verified) {
    const error = new Error(
      'El prestador todavía no está verificado'
    );

    error.statusCode = 403;

    throw error;
  }

  return provider;
}

// ============================================================
// CREAR SOLICITUD
// ============================================================

async function createServiceRequest(userId, payload) {
  const {
    serviceType,
    origin,
    destination,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    packageDescription,
    packageWeight,
    packageDimensions,
    requesterNote,
    requestedDate
  } = payload;

  const normalizedServiceType =
    normalizeString(serviceType, 100);

  const normalizedOrigin =
    normalizeString(origin, 500);

  const normalizedDestination =
    normalizeString(destination, 500);

  if (!normalizedServiceType) {
    throw Object.assign(
      new Error('El tipo de servicio es obligatorio'),
      { statusCode: 400 }
    );
  }

  if (!normalizedOrigin) {
    throw Object.assign(
      new Error('El origen es obligatorio'),
      { statusCode: 400 }
    );
  }

  if (!normalizedDestination) {
    throw Object.assign(
      new Error('El destino es obligatorio'),
      { statusCode: 400 }
    );
  }

  const weight =
    packageWeight === undefined ||
    packageWeight === null ||
    packageWeight === ''
      ? 0
      : Number(packageWeight);

  if (!Number.isFinite(weight) || weight < 0) {
    throw Object.assign(
      new Error('El peso del envío no es válido'),
      { statusCode: 400 }
    );
  }

  const requestedDateValue =
    requestedDate || null;

  if (requestedDateValue) {
    const date = new Date(requestedDateValue);

    if (Number.isNaN(date.getTime())) {
      throw Object.assign(
        new Error('La fecha solicitada no es válida'),
        { statusCode: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      requester_id: userId,
      service_type: normalizedServiceType,
      origin: normalizedOrigin,
      destination: normalizedDestination,
      origin_lat: parseOptionalNumber(originLat),
      origin_lng: parseOptionalNumber(originLng),
      destination_lat: parseOptionalNumber(destinationLat),
      destination_lng: parseOptionalNumber(destinationLng),
      price: 0,
      platform_fee: 0,
      status: 'pending',
      package_description:
        normalizeString(packageDescription, 1000),
      package_weight: weight,
      package_dimensions:
        normalizeString(packageDimensions, 300),
      requester_note:
        normalizeString(requesterNote, 1000),
      requested_date: requestedDateValue
    })
    .select(`
      id,
      requester_id,
      provider_id,
      service_type,
      origin,
      destination,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      price,
      platform_fee,
      status,
      package_description,
      package_weight,
      package_dimensions,
      requester_note,
      requested_date,
      accepted_at,
      completed_at,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(
      `No se pudo crear la solicitud: ${error.message}`
    );
  }

  return data;
}

// ============================================================
// LISTAR SOLICITUDES DISPONIBLES
// ============================================================

async function getAvailableRequests(userId) {
  const provider = await requireProvider(userId);

  if (!provider.active) {
    return [];
  }

  if (
    !PROVIDER_AVAILABILITY.includes(
      provider.availability_status
    )
  ) {
    return [];
  }

  if (
    !['available', 'available_at']
      .includes(provider.availability_status)
  ) {
    return [];
  }

  let query = supabase
    .from('service_requests')
    .select(`
      id,
      requester_id,
      provider_id,
      service_type,
      origin,
      destination,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      price,
      platform_fee,
      status,
      package_description,
      package_weight,
      package_dimensions,
      requester_note,
      requested_date,
      created_at,
      updated_at
    `)
    .in('status', OPEN_REQUEST_STATUSES)
    .is('provider_id', null)
    .order('created_at', {
      ascending: false
    })
    .limit(100);

  if (provider.service_type) {
    query = query.eq(
      'service_type',
      provider.service_type
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `No se pudieron obtener las solicitudes: ${error.message}`
    );
  }

  return data || [];
}

// ============================================================
// OBTENER SOLICITUD
// ============================================================

async function getServiceRequest(
  requestId,
  userId
) {
  const { data: request, error } = await supabase
    .from('service_requests')
    .select(`
      id,
      requester_id,
      provider_id,
      service_type,
      origin,
      destination,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      price,
      platform_fee,
      status,
      package_description,
      package_weight,
      package_dimensions,
      requester_note,
      requested_date,
      accepted_at,
      completed_at,
      created_at,
      updated_at
    `)
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando la solicitud: ${error.message}`
    );
  }

  if (!request) {
    const notFound = new Error(
      'Solicitud logística no encontrada'
    );

    notFound.statusCode = 404;

    throw notFound;
  }

  const provider =
    request.provider_id
      ? await supabase
          .from('logistics_providers')
          .select('id,user_id')
          .eq('id', request.provider_id)
          .maybeSingle()
      : { data: null };

  const providerUserId =
    provider.data?.user_id || null;

  if (
    request.requester_id !== userId &&
    providerUserId !== userId
  ) {
    const forbidden = new Error(
      'No tenés permiso para ver esta solicitud'
    );

    forbidden.statusCode = 403;

    throw forbidden;
  }

  return request;
}

// ============================================================
// CREAR OFERTA
// ============================================================

async function createOffer(
  requestId,
  userId,
  payload
) {
  const provider =
    await requireProvider(userId);

  if (!provider.active) {
    throw Object.assign(
      new Error(
        'El prestador no está activo para recibir solicitudes'
      ),
      { statusCode: 403 }
    );
  }

  if (
    !['available', 'available_at']
      .includes(provider.availability_status)
  ) {
    throw Object.assign(
      new Error(
        'El prestador no está disponible para realizar una oferta'
      ),
      { statusCode: 409 }
    );
  }

  const { data: request, error: requestError } =
    await supabase
      .from('service_requests')
      .select(`
        id,
        requester_id,
        provider_id,
        service_type,
        status
      `)
      .eq('id', requestId)
      .maybeSingle();

  if (requestError) {
    throw new Error(
      `Error consultando la solicitud: ${requestError.message}`
    );
  }

  if (!request) {
    throw Object.assign(
      new Error('Solicitud logística no encontrada'),
      { statusCode: 404 }
    );
  }

  if (
    !OPEN_REQUEST_STATUSES.includes(
      request.status
    )
  ) {
    throw Object.assign(
      new Error('La solicitud ya no está abierta'),
      { statusCode: 409 }
    );
  }

  if (request.provider_id) {
    throw Object.assign(
      new Error('La solicitud ya tiene un prestador asignado'),
      { statusCode: 409 }
    );
  }

  if (
    request.service_type !== provider.service_type
  ) {
    throw Object.assign(
      new Error(
        'El tipo de servicio no coincide con el servicio del prestador'
      ),
      { statusCode: 400 }
    );
  }

  if (request.requester_id === userId) {
    throw Object.assign(
      new Error(
        'No podés ofertar sobre tu propia solicitud'
      ),
      { statusCode: 400 }
    );
  }

  const price =
    parsePositiveNumber(payload.price);

  if (price === null) {
    throw Object.assign(
      new Error(
        'El precio de la oferta debe ser mayor a cero'
      ),
      { statusCode: 400 }
    );
  }

  const estimatedMinutes =
    parsePositiveInteger(
      payload.estimatedMinutes
    );

  const message =
    normalizeString(payload.message, 1000);

  const { data: offer, error } =
    await supabase
      .from('logistics_offers')
      .insert({
        request_id: requestId,
        provider_id: provider.id,
        price,
        message,
        estimated_minutes: estimatedMinutes,
        status: 'pending'
      })
      .select(`
        id,
        request_id,
        provider_id,
        price,
        message,
        estimated_minutes,
        status,
        created_at,
        updated_at
      `)
      .single();

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(
        new Error(
          'Ya realizaste una oferta para esta solicitud'
        ),
        { statusCode: 409 }
      );
    }

    throw new Error(
      `No se pudo crear la oferta: ${error.message}`
    );
  }

  return offer;
}

// ============================================================
// LISTAR OFERTAS
// ============================================================

async function getOffers(
  requestId,
  userId
) {
  const { data: request, error: requestError } =
    await supabase
      .from('service_requests')
      .select(`
        id,
        requester_id,
        provider_id,
        status
      `)
      .eq('id', requestId)
      .maybeSingle();

  if (requestError) {
    throw new Error(
      `Error consultando la solicitud: ${requestError.message}`
    );
  }

  if (!request) {
    throw Object.assign(
      new Error('Solicitud logística no encontrada'),
      { statusCode: 404 }
    );
  }

  let providerUserId = null;

  if (request.provider_id) {
    const { data: assignedProvider } =
      await supabase
        .from('logistics_providers')
        .select('user_id')
        .eq('id', request.provider_id)
        .maybeSingle();

    providerUserId =
      assignedProvider?.user_id || null;
  }

  const isRequester =
    request.requester_id === userId;

  const isAssignedProvider =
    providerUserId === userId;

  if (
    !isRequester &&
    !isAssignedProvider
  ) {
    const currentProvider =
      await getProviderByUserId(userId);

    if (!currentProvider) {
      throw Object.assign(
        new Error(
          'No tenés permiso para ver estas ofertas'
        ),
        { statusCode: 403 }
      );
    }

    const { data: ownOffer } =
      await supabase
        .from('logistics_offers')
        .select('id')
        .eq('request_id', requestId)
        .eq('provider_id', currentProvider.id)
        .maybeSingle();

    if (!ownOffer) {
      throw Object.assign(
        new Error(
          'No tenés permiso para ver estas ofertas'
        ),
        { statusCode: 403 }
      );
    }
  }

  const { data: offers, error } =
    await supabase
      .from('logistics_offers')
      .select(`
        id,
        request_id,
        provider_id,
        price,
        message,
        estimated_minutes,
        status,
        created_at,
        updated_at,
        logistics_providers (
          id,
          user_id,
          service_type,
          verified,
          rating,
          latitude,
          longitude,
          availability_status,
          availability_note,
          available_at
        )
      `)
      .eq('request_id', requestId)
      .order('price', {
        ascending: true
      })
      .order('created_at', {
        ascending: true
      });

  if (error) {
    throw new Error(
      `No se pudieron obtener las ofertas: ${error.message}`
    );
  }

  const providerIds = [
    ...new Set(
      (offers || [])
        .map(
          offer =>
            offer.logistics_providers?.user_id
        )
        .filter(Boolean)
    )
  ];

  let users = [];

  if (providerIds.length > 0) {
    const { data: providerUsers, error: usersError } =
      await supabase
        .from('users')
        .select(`
          id,
          name,
          avatar,
          verified,
          rating
        `)
        .in('id', providerIds);

    if (usersError) {
      throw new Error(
        `No se pudieron obtener los perfiles de prestadores: ${usersError.message}`
      );
    }

    users = providerUsers || [];
  }

  const userMap = new Map(
    users.map(user => [
      String(user.id),
      user
    ])
  );

  return (offers || []).map(offer => ({
    ...offer,
    provider: offer.logistics_providers
      ? {
          ...offer.logistics_providers,
          user:
            userMap.get(
              String(
                offer.logistics_providers.user_id
              )
            ) || null
        }
      : null
  }));
}

// ============================================================
// ACEPTAR OFERTA
// ============================================================

async function acceptOffer(
  requestId,
  offerId,
  userId
) {
  const { data: request, error: requestError } =
    await supabase
      .from('service_requests')
      .select('id,requester_id,status')
      .eq('id', requestId)
      .maybeSingle();

  if (requestError) {
    throw new Error(
      `Error consultando la solicitud: ${requestError.message}`
    );
  }

  if (!request) {
    throw Object.assign(
      new Error('Solicitud logística no encontrada'),
      { statusCode: 404 }
    );
  }

  if (request.requester_id !== userId) {
    throw Object.assign(
      new Error(
        'Solo el usuario que creó la solicitud puede aceptar una oferta'
      ),
      { statusCode: 403 }
    );
  }

  if (
    !OPEN_REQUEST_STATUSES.includes(
      request.status
    )
  ) {
    throw Object.assign(
      new Error('La solicitud ya no está disponible'),
      { statusCode: 409 }
    );
  }

  const { data, error } =
    await supabase.rpc(
      'accept_logistics_offer',
      {
        p_request_id: requestId,
        p_offer_id: offerId,
        p_provider_id: (
          await getOfferProviderId(
            offerId,
            requestId
          )
        )
      }
    );

  if (error) {
    console.error(
      '❌ Error aceptando oferta:',
      error
    );

    const rpcError = new Error(
      error.message ||
      'No se pudo aceptar la oferta'
    );

    rpcError.statusCode =
      error.code === 'P0001'
        ? 409
        : 500;

    throw rpcError;
  }

  return Array.isArray(data)
    ? data[0]
    : data;
}

async function getOfferProviderId(
  offerId,
  requestId
) {
  const { data, error } =
    await supabase
      .from('logistics_offers')
      .select('provider_id')
      .eq('id', offerId)
      .eq('request_id', requestId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando la oferta: ${error.message}`
    );
  }

  if (!data) {
    const notFound = new Error(
      'Oferta logística no encontrada'
    );

    notFound.statusCode = 404;

    throw notFound;
  }

  return data.provider_id;
}

// ============================================================
// RETIRAR OFERTA
// ============================================================

async function withdrawOffer(
  offerId,
  userId
) {
  const provider =
    await requireProvider(userId);

  const { data, error } =
    await supabase.rpc(
      'withdraw_logistics_offer',
      {
        p_offer_id: offerId,
        p_provider_id: provider.id
      }
    );

  if (error) {
    const rpcError = new Error(
      error.message ||
      'No se pudo retirar la oferta'
    );

    rpcError.statusCode =
      error.code === 'P0001'
        ? 409
        : 500;

    throw rpcError;
  }

  return Array.isArray(data)
    ? data[0]
    : data;
}

// ============================================================
// DISPONIBILIDAD DEL PRESTADOR
// ============================================================

async function updateProviderAvailability(
  userId,
  payload
) {
  const provider =
    await requireProvider(userId);

  const status =
    normalizeString(
      payload.status,
      30
    );

  if (
    !PROVIDER_AVAILABILITY.includes(status)
  ) {
    throw Object.assign(
      new Error(
        'Estado de disponibilidad inválido'
      ),
      { statusCode: 400 }
    );
  }

  const note =
    normalizeString(
      payload.note,
      500
    );

  let availableAt = null;

  if (status === 'available_at') {
    if (!payload.availableAt) {
      throw Object.assign(
        new Error(
          'Debés indicar cuándo estarás disponible'
        ),
        { statusCode: 400 }
      );
    }

    const date =
      new Date(payload.availableAt);

    if (Number.isNaN(date.getTime())) {
      throw Object.assign(
        new Error(
          'La fecha de disponibilidad no es válida'
        ),
        { statusCode: 400 }
      );
    }

    if (date.getTime() <= Date.now()) {
      throw Object.assign(
        new Error(
          'La disponibilidad debe ser futura'
        ),
        { statusCode: 400 }
      );
    }

    availableAt =
      date.toISOString();
  }

  const { data, error } =
    await supabase
      .from('logistics_providers')
      .update({
        availability_status: status,
        availability_note: note,
        available_at: availableAt,
        active:
          status !== 'busy',
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .select(`
        id,
        user_id,
        service_type,
        verified,
        active,
        rating,
        latitude,
        longitude,
        availability_status,
        availability_no
