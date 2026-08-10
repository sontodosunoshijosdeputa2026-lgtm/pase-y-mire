const express = require('express');
const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

router.use(authMiddleware);

// ============================================================
// ENVIAR SOLICITUD DE AMISTAD
// POST /api/friends/request
// ============================================================

router.post('/request', async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = Number(req.body.receiverId);

    if (!Number.isInteger(receiverId)) {
      return res.status(400).json({
        success: false,
        error: 'receiverId inválido'
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        error: 'No podés enviarte una solicitud a vos mismo'
      });
    }

    // Verificar que el receptor exista
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id,name,avatar')
      .eq('id', receiverId)
      .maybeSingle();

    if (receiverError) {
      console.error('Error buscando receptor:', receiverError);

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
      .select('*')
      .eq('status', 'pending')
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),` +
        `and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
      )
      .maybeSingle();

    if (pendingError) {
      console.error('Error comprobando solicitud:', pendingError);

      return res.status(500).json({
        success: false,
        error: 'Error comprobando solicitudes'
      });
    }

    if (pendingRequest) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una solicitud pendiente'
      });
    }

    const { data: request, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creando solicitud:', insertError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo enviar la solicitud'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Solicitud de amistad enviada',
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
// LISTAR SOLICITUDES RECIBIDAS
// GET /api/friends/requests/received
// ============================================================

router.get('/requests/received', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at,
        sender:users!friend_requests_sender_id_fkey (
          id,
          name,
          avatar,
          rating
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error solicitudes recibidas:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las solicitudes'
      });
    }

    return res.json({
      success: true,
      requests: data || []
    });

  } catch (error) {
    console.error('Error GET requests/received:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// LISTAR SOLICITUDES ENVIADAS
// GET /api/friends/requests/sent
// ============================================================

router.get('/requests/sent', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at,
        receiver:users!friend_requests_receiver_id_fkey (
          id,
          name,
          avatar,
          rating
        )
      `)
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error solicitudes enviadas:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las solicitudes'
      });
    }

    return res.json({
      success: true,
      requests: data || []
    });

  } catch (error) {
    console.error('Error GET requests/sent:', error);

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
    const userId = req.user.id;
    const requestId = req.params.id;

    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
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

    const { data: friendship, error: friendshipError } = await supabase
      .from('friends')
      .insert({
        user_id: request.sender_id,
        friend_id: request.receiver_id
      })
      .select('*')
      .single();

    if (friendshipError) {
      console.error('Error creando amistad:', friendshipError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear la amistad'
      });
    }

    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({
        status: 'accepted'
      })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error actualizando solicitud:', updateError);

      // Intentar evitar una amistad huérfana
      await supabase
        .from('friends')
        .delete()
        .eq('id', friendship.id);

      return res.status(500).json({
        success: false,
        error: 'No se pudo actualizar la solicitud'
      });
    }

    return res.json({
      success: true,
      message: 'Solicitud aceptada',
      friendship
    });

  } catch (error) {
    console.error('Error accept request:', error);

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
    const userId = req.user.id;
    const requestId = req.params.id;

    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('id')
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

    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'rejected'
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      console.error('Error rechazando solicitud:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo rechazar la solicitud'
      });
    }

    return res.json({
      success: true,
      message: 'Solicitud rechazada',
      request: data
    });

  } catch (error) {
    console.error('Error reject request:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


// ============================================================
// CANCELAR SOLICITUD ENVIADA
// POST /api/friends/requests/:id/cancel
// ============================================================

router.post('/requests/:id/cancel', async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .update({
        status: 'cancelled'
      })
      .eq('id', requestId)
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .select('*')
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
    console.error('Error cancel request:', error);

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
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        user:users!friends_user_id_fkey (
          id,
          name,
          avatar,
          rating
        ),
        friend:users!friends_friend_id_fkey (
          id,
          name,
          avatar,
          rating
        )
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo amigos:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener los amigos'
      });
    }

    const friends = (data || []).map(item => {
      const friend =
        Number(item.user_id) === Number(userId)
          ? item.friend
          : item.user;

      return {
        friendshipId: item.id,
        createdAt: item.created_at,
        friend
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
    const userId = req.user.id;
    const friendId = Number(req.params.friendId);

    if (!Number.isInteger(friendId)) {
      return res.status(400).json({
        success: false,
        error: 'friendId inválido'
      });
    }

    const { data, error } = await supabase
      .from('friends')
      .delete()
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),` +
        `and(user_id.eq.${friendId},friend_id.eq.${userId})`
      )
      .select('*');

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
    console.error('Error DELETE /friends:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});


module.exports = router;
