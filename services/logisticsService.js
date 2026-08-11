const supabase = require('../utils/supabase');

const OPEN_REQUEST_STATUSES = ['pending', 'open'];

const OFFER_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'withdrawn'
];

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
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
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
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ============================================================
// IDENTIFICADOR DE USUARIO
// ============================================================

function normalizeUserId(userId) {
  if (
    userId === undefined ||
    userId === null ||
    userId === ''
  ) {
    return null;
  }

  const value = String(userId).trim();

  if (!value) {
    return null;
  }

  return value;
}

function isOpenRequestStatus(status) {
  return OPEN_REQUEST_STATUSES.includes(status);
}

function isOfferStatus(status) {
  return OFFER_STATUSES.includes(status);
}

// ============================================================
// PRESTADOR
// ============================================================

async function getProviderByUserId(userId) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createServiceError(
      'El identificador del usuario no es válido',
      400
    );
  }

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
    .eq('user_id', normalizedUserId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error obteniendo prestador: ${error.message}`
    );
  }

  return data;
}

async function requireProvider(userId) {
  const provider = await getProviderByUserId(userId);

  if (!provider) {
    throw createServiceError(
      'El usuario no está registrado como prestador de logística',
      403
    );
  }

  if (!provider.verified) {
    throw createServiceError(
      'El prestador todavía no está verificado',
      403
    );
  }

  return provider;
}

// ============================================================
// CREAR SOLICITUD
// ============================================================

async function createServiceRequest(userId, payload = {}) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createServiceError(
      'El identificador del usuario no es válido',
      400
    );
  }

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
    throw createServiceError(
      'El tipo de servicio es obligatorio',
      400
    );
  }

  if (!normalizedOrigin) {
    throw createServiceError(
      'El origen es obligatorio',
      400
    );
  }

  if (!normalizedDestination) {
    throw createServiceError(
      'El destino es obligatorio',
      400
    );
  }

  const weight =
    packageWeight === undefined ||
    packageWeight === null ||
    packageWeight === ''
      ? 0
      : Number(packageWeight);

  if (!Number.isFinite(weight) || weight < 0) {
    throw createServiceError(
      'El peso del envío no es válido',
      400
    );
  }

  const requestedDateValue =
    requestedDate || null;

  if (requestedDateValue) {
    const date = new Date(requestedDateValue);

    if (Number.isNaN(date.getTime())) {
      throw createServiceError(
        'La fecha solicitada no es válida',
        400
      );
    }
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      requester_id: normalizedUserId,
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

  if (provider.availability_status !== 'available') {
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
      accepted_at,
      completed_at,
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
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createServiceError(
      'El identificador del usuario no es válido',
      400
    );
  }

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
    throw createServiceError(
      'Solicitud logística no encontrada',
      404
    );
  }

  let providerUserId = null;

  if (request.provider_id) {
    const {
      data: provider,
      error: providerError
    } = await supabase
      .from('logistics_providers')
      .select('id,user_id')
      .eq('id', request.provider_id)
      .maybeSingle();

    if (providerError) {
      throw new Error(
        `Error consultando el prestador asignado: ${providerError.message}`
      );
    }

    providerUserId =
      provider?.user_id !== null &&
      provider?.user_id !== undefined
        ? String(provider.user_id)
        : null;
  }

  if (
    String(request.requester_id) !== normalizedUserId &&
    providerUserId !== normalizedUserId
  ) {
    throw createServiceError(
      'No tenés permiso para ver esta solicitud',
      403
    );
  }

  return request;
}

// ============================================================
// CREAR OFERTA
// ============================================================

async function createOffer(
  requestId,
  userId,
  payload = {}
) {
  const provider =
    await requireProvider(userId);

  if (!provider.active) {
    throw createServiceError(
      'El prestador no está activo para recibir solicitudes',
      403
    );
  }

  if (provider.availability_status !== 'available') {
    throw createServiceError(
      'El prestador no está disponible para realizar una oferta',
      409
    );
  }

  const {
    data: request,
    error: requestError
  } = await supabase
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
    throw createServiceError(
      'Solicitud logística no encontrada',
      404
    );
  }

  if (!isOpenRequestStatus(request.status)) {
    throw createServiceError(
      'La solicitud ya no está abierta',
      409
    );
  }

  if (request.provider_id) {
    throw createServiceError(
      'La solicitud ya tiene un prestador asignado',
      409
    );
  }

  if (
    request.service_type !== provider.service_type
  ) {
    throw createServiceError(
      'El tipo de servicio no coincide con el servicio del prestador',
      400
    );
  }

  if (
    String(request.requester_id) ===
    String(userId)
  ) {
    throw createServiceError(
      'No podés ofertar sobre tu propia solicitud',
      400
    );
  }

  const price =
    parsePositiveNumber(payload.price);

  if (price === null) {
    throw createServiceError(
      'El precio de la oferta debe ser mayor a cero',
      400
    );
  }

  const estimatedMinutes =
    parsePositiveInteger(
      payload.estimatedMinutes
    );

  const message =
    normalizeString(payload.message, 1000);

  const {
    data: offer,
    error
  } = await supabase
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
      throw createServiceError(
        'Ya realizaste una oferta para esta solicitud',
        409
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
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createServiceError(
      'El identificador del usuario no es válido',
      400
    );
  }

  const {
    data: request,
    error: requestError
  } = await supabase
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
    throw createServiceError(
      'Solicitud logística no encontrada',
      404
    );
  }

  let providerUserId = null;

  if (request.provider_id) {
    const {
      data: assignedProvider,
      error: providerError
    } = await supabase
      .from('logistics_providers')
      .select('user_id')
      .eq('id', request.provider_id)
      .maybeSingle();

    if (providerError) {
      throw new Error(
        `Error consultando el prestador asignado: ${providerError.message}`
      );
    }

    providerUserId =
      assignedProvider?.user_id !== null &&
      assignedProvider?.user_id !== undefined
        ? String(assignedProvider.user_id)
        : null;
  }

  const isRequester =
    String(request.requester_id) === normalizedUserId;

  const isAssignedProvider =
    providerUserId === normalizedUserId;

  if (!isRequester && !isAssignedProvider) {
    const currentProvider =
      await getProviderByUserId(normalizedUserId);

    if (!currentProvider) {
      throw createServiceError(
        'No tenés permiso para ver estas ofertas',
        403
      );
    }

    const {
      data: ownOffer,
      error: ownOfferError
    } = await supabase
      .from('logistics_offers')
      .select('id')
      .eq('request_id', requestId)
      .eq('provider_id', currentProvider.id)
      .maybeSingle();

    if (ownOfferError) {
      throw new Error(
        `Error verificando la oferta del prestador: ${ownOfferError.message}`
      );
    }

    if (!ownOffer) {
      throw createServiceError(
        'No tenés permiso para ver estas ofertas',
        403
      );
    }
  }

  const {
    data: offers,
    error
  } = await supabase
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
        .filter(
          id =>
            id !== null &&
            id !== undefined
        )
        .map(id => String(id))
    )
  ];

  let users = [];

  if (providerIds.length > 0) {
    const {
      data: providerUsers,
      error: usersError
    } = await supabase
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
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw createServiceError(
      'El identificador del usuario no es válido',
      400
    );
  }

  const {
    data: request,
    error: requestError
  } = await supabase
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
    throw createServiceError(
      'Solicitud logística no encontrada',
      404
    );
  }

  if (
    String(request.requester_id) !==
    normalizedUserId
  ) {
    throw createServiceError(
      'Solo el usuario que creó la solicitud puede aceptar una oferta',
      403
    );
  }

  if (!isOpenRequestStatus(request.status)) {
    throw createServiceError(
      'La solicitud ya no está disponible',
      409
    );
  }

  const providerId =
    await getOfferProviderId(
      offerId,
      requestId
    );

  const {
    data,
    error
  } = await supabase.rpc(
    'accept_logistics_offer',
    {
      p_request_id: requestId,
      p_offer_id: offerId,
      p_provider_id: providerId
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
      error.code === 'P0001' ||
      error.code === '23505'
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
  const {
    data,
    error
  } = await supabase
    .from('logistics_offers')
    .select(`
      id,
      request_id,
      provider_id,
      status
    `)
    .eq('id', offerId)
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando la oferta: ${error.message}`
    );
  }

  if (!data) {
    throw createServiceError(
      'Oferta logística no encontrada',
      404
    );
  }

  if (!isOfferStatus(data.status)) {
    throw createServiceError(
      'La oferta tiene un estado inválido',
      409
    );
  }

  if (data.status !== 'pending') {
    throw createServiceError(
      'La oferta ya no está disponible para ser aceptada',
      409
    );
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

  const {
    data,
    error
  } = await supabase.rpc(
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

// =============
