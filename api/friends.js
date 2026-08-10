const express = require('express');
const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

router.use(authMiddleware);

// ============================================================
// BUSCAR USUARIOS
// GET /api/friends/search?q=texto
// ============================================================

router.get('/search', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const query = String(req.query.q || '').trim();

    if (query.length < 2) {
      return res.json({
        success: true,
        users: []
      });
    }

    const escapedQuery = query.replace(/[%_]/g, '\\$&');

    const { data, error } = await supabase
      .from('users')
      .select('id,name,email,avatar,rating,verified')
      .neq('id', currentUserId)
      .or(
        `name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`
      )
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error buscando usuarios:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron buscar usuarios'
      });
    }

    return res.json({
      success: true,
      users: data || []
    });

  } catch (error) {
    console.error('Error GET /friends/search:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// ENVIAR SOLICITUD DE AMISTAD
// POST /api/friends/request
// ============================================================

router.post('/request', async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const receiverId = Number(req.body.userId ?? req.body.receiverId);

    if (!Number.isInteger(receiverId)) {
      return res.status(400).json({
        success: false,
        error: 'Usuario destinatario inválido'
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        error: 'No podés enviarte una solicitud a vos mismo'
      });
    }

    // Verificar destinatario
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id,name,email,avatar,rating')
      .eq('id', receiverId)
      .maybeSingle();

    if (receiverError) {
      console.error('Error buscando destinatario:', receiverError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando el usuario'
      });
    }

    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar amistad existente
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .select('id')
      .or(
        `and(user_id.eq.${senderId},friend_id.eq.${receiverId}),` +
        `and(user_id.eq.${receiverId},friend_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();

    if (friendshipError) {
      console.error('Error comprobando amistad:', friendshipError);

      return res.status(500).json({
        success: false,
        error: 'Error comprobando la amistad'
      });
    }

    if (friendship) {
      return res.status(409).json({
        success: false,
        error: 'Ya son amigos'
      });
    }

    // Buscar solicitud pendiente en cualquiera de las dos direcciones
    const { data: pendingRequest, error: pendingError } = await supabase
      .from('friend_requests')
      .select('id,sender_id,receiver_id,status')
      .eq('status', 'pending')
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),` +
        `and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      console.error('Error comprobando solicitud:', pendingError);

      return res.status(500).json({
        success: false,
        error: 'Error comprobando solicitudes'
      });
    }

    if (pendingRequest) {
      if (Number(pendingRequest.sender_id) === receiverId) {
        return res.status(409).json({
          success: false,
          error: 'Ese usuario ya te envió una solicitud'
        });
      }

      return res.status(409).json({
        success: false,
        error: 'Ya existe una solicitud pendiente'
      });
    }

    // Crear solicitud
    const { data: request, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select('id,sender_id,receiver_id,status,created_at,updated_at')
      .single();

    if (insertError) {
      console.error('Error creando solicitud:', insertError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo enviar la solicitud'
      });
    }

    // Crear notificación si la tabla existe y está disponible.
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: receiverId,
        type: 'friend_request',
        title: 'Nueva solicitud de amistad',
        body: `${req.user.name || 'Un usuario'} quiere agregarte como amigo`,
        data: {
          request_id: request.id,
          sender_id: senderId
        },
        read: false
      });

    if (notificationError) {
      // La solicitud ya fue creada. No la revertimos por una notificación.
      console.error(
        'Advertencia creando notificación de amistad:',
        notificationError
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada',
      request
    });

  } catch (error) {
    console.error('Error POST /friends/request:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// SOLICITUDES RECIBIDAS
// GET /api/friends/requests
// ============================================================

router.get('/requests', async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo solicitudes:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las solicitudes'
      });
    }

    const senderIds = [...new Set(
      (requests || []).map(request => Number(request.sender_id))
    )];

    let users = [];

    if (senderIds.length > 0) {
      const { data: senderUsers, error: usersError } = await supabase
        .from('users')
        .select('id,name,email,avatar,rating,verified')
        .in('id', senderIds);

      if (usersError) {
        console.error('Error obteniendo remitentes:', usersError);

        return res.status(500).json({
          success: false,
          error: 'No se pudieron obtener los usuarios'
        });
      }

      users = senderUsers || [];
    }

    const userMap = new Map(
      users.map(user => [String(user.id), user])
    );

    const result = (requests || []).map(request => ({
      id: request.id,
      sender_id: request.sender_id,
      receiver_id: request.receiver_id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      user: userMap.get(String(request.sender_id)) || null
    }));

    return res.json({
      success: true,
      requests: result
    });

  } catch (error) {
    console.error('Error GET /friends/requests:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// SOLICITUDES ENVIADAS
// GET /api/friends/requests/sent
// ============================================================

router.get('/requests/sent', async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at
      `)
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo solicitudes enviadas:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las solicitudes enviadas'
      });
    }

    const receiverIds = [...new Set(
      (requests || []).map(request => Number(request.receiver_id))
    )];

    let users = [];

    if (receiverIds.length > 0) {
      const { data: receiverUsers, error: usersError } = await supabase
        .from('users')
        .select('id,name,email,avatar,rating,verified')
        .in('id', receiverIds);

      if (usersError) {
        console.error('Error obteniendo destinatarios:', usersError);

        return res.status(500).json({
          success: false,
          error: 'No se pudieron obtener los destinatarios'
        });
      }

      users = receiverUsers || [];
    }

    const userMap = new Map(
      users.map(user => [String(user.id), user])
    );

    const result = (requests || []).map(request => ({
      id: request.id,
      sender_id: request.sender_id,
      receiver_id: request.receiver_id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      user: userMap.get(String(request.receiver_id)) || null
    }));

    return res.json({
      success: true,
      requests: result
    });

  } catch (error) {
    console.error('Error GET /friends/requests/sent:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// ACEPTAR SOLICITUD
// POST /api/friends/requests/:id/accept
// ============================================================

router.post('/requests/:id/accept', async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const requestId = req.params.id;

    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('id,sender_id,receiver_id,status')
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (requestError) {
      console.error('Error buscando solicitud:', requestError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando la solicitud'
      });
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    // Crear la amistad.
    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .insert({
        user_id: Number(request.sender_id),
        friend_id: Number(request.receiver_id)
      })
      .select('id,user_id,friend_id,created_at')
      .single();

    if (friendshipError) {
      // Puede ocurrir si la amistad ya fue creada.
      if (friendshipError.code === '23505') {
        await supabase
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', request.id);

        return res.json({
          success: true,
          message: 'La amistad ya existía'
        });
      }

      console.error('Error creando amistad:', friendshipError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear la amistad'
      });
    }

    // Marcar solicitud como aceptada.
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({
        status: 'accepted'
      })
      .eq('id', request.id)
      .eq('receiver_id', userId);

    if (updateError) {
      console.error('Error actualizando solicitud:', updateError);

      // Rollback manual de la amistad recién creada.
      await supabase
        .from('friends')
        .delete()
        .eq('id', friendship.id);

      return res.status(500).json({
        success: false,
        error: 'No se pudo completar la aceptación'
      });
    }

    // Notificar al usuario que envió la solicitud.
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: Number(request.sender_id),
        type: 'friend_accepted',
        title: 'Solicitud aceptada',
        body: `${req.user.name || 'Un usuario'} aceptó tu solicitud de amistad`,
        data: {
          request_id: request.id,
          friend_id: userId
        },
        read: false
      });

    if (notificationError) {
      console.error(
        'Advertencia creando notificación de aceptación:',
        notificationError
      );
    }

    return res.json({
      success: true,
      message: 'Solicitud aceptada',
      friendship
    });

  } catch (error) {
    console.error('Error POST /friends/requests/:id/accept:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// RECHAZAR SOLICITUD
// POST /api/friends/requests/:id/reject
// ============================================================

router.post('/requests/:id/reject', async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const requestId = req.params.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'rejected'
      })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .select('id,sender_id,receiver_id,status,created_at,updated_at')
      .maybeSingle();

    if (error) {
      console.error('Error rechazando solicitud:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo rechazar la solicitud'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    return res.json({
      success: true,
      message: 'Solicitud rechazada',
      request: data
    });

  } catch (error) {
    console.error('Error POST /friends/requests/:id/reject:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// CANCELAR SOLICITUD
// POST /api/friends/requests/:id/cancel
// ============================================================

router.post('/requests/:id/cancel', async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const requestId = req.params.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'cancelled'
      })
      .eq('id', requestId)
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .select('id,sender_id,receiver_id,status,created_at,updated_at')
      .maybeSingle();

    if (error) {
      console.error('Error cancelando solicitud:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo cancelar la solicitud'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada'
      });
    }

    return res.json({
      success: true,
      message: 'Solicitud cancelada',
      request: data
    });

  } catch (error) {
    console.error('Error POST /friends/requests/:id/cancel:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// LISTAR AMIGOS
// GET /api/friends
// ============================================================

router.get('/', async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const { data: friendships, error } = await supabase
      .from('friends')
      .select('id,user_id,friend_id,created_at')
      .or(
        `user_id.eq.${userId},friend_id.eq.${userId}`
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo amistades:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener los amigos'
      });
    }

    const friendIds = [...new Set(
      (friendships || []).map(friendship =>
        Number(friendship.user_id) === userId
          ? Number(friendship.friend_id)
          : Number(friendship.user_id)
      )
    )];

    let users = [];

    if (friendIds.length > 0) {
      const { data: friendUsers, error: usersError } = await supabase
        .from('users')
        .select('id,name,email,avatar,rating,verified')
        .in('id', friendIds);

      if (usersError) {
        console.error('Error obteniendo amigos:', usersError);

        return res.status(500).json({
          success: false,
          error: 'No se pudieron obtener los datos de los amigos'
        });
      }

      users = friendUsers || [];
    }

    const userMap = new Map(
      users.map(user => [String(user.id), user])
    );

    const friends = (friendships || []).map(friendship => {
      const friendId =
        Number(friendship.user_id) === userId
          ? Number(friendship.friend_id)
          : Number(friendship.user_id);

      return {
        id: friendId,
        friendshipId: friendship.id,
        created_at: friendship.created_at,
        name: userMap.get(String(friendId))?.name || 'Usuario',
        email: userMap.get(String(friendId))?.email || '',
        avatar: userMap.get(String(friendId))?.avatar || null,
        rating: userMap.get(String(friendId))?.rating ?? 5,
        verified: userMap.get(String(friendId))?.verified ?? false
      };
    });

    return res.json({
      success: true,
      friends
    });

  } catch (error) {
    console.error('Error GET /friends:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// ELIMINAR AMISTAD
// DELETE /api/friends/:friendId
// ============================================================

router.delete('/:friendId', async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const friendId = Number(req.params.friendId);

    if (!Number.isInteger(friendId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de amigo inválido'
      });
    }

    const { data, error } = await supabase
      .from('friends')
      .delete()
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),` +
        `and(user_id.eq.${friendId},friend_id.eq.${userId})`
      )
      .select('id');

    if (error) {
      console.error('Error eliminando amistad:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo eliminar la amistad'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Amistad no encontrada'
      });
    }

    return res.json({
      success: true,
      message: 'Amistad eliminada'
    });

  } catch (error) {
    console.error('Error DELETE /friends/:friendId:', error);

    return res.status(500).json({
      success: false,
      error: 'Error int
