const express = require('express');

const { authMiddleware } = require('../utils/auth');

const {
  createServiceRequest,
  getAvailableRequests,
  getServiceRequest,
  createOffer,
  getOffers,
  acceptOffer,
  withdrawOffer,
  updateProviderAvailability,
  getMyRequests,
  getMyOffers,
  getProviderByUserId
} = require('../services/logisticsService');

const router = express.Router();

router.use(authMiddleware);

// ============================================================
// CREAR SOLICITUD LOGÍSTICA
// POST /api/logistics/requests
// ============================================================

router.post('/requests', async (req, res) => {
  try {
    const request =
      await createServiceRequest(
        req.user.id,
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      request
    });

  } catch (error) {
    console.error(
      '❌ POST /api/logistics/requests:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      error:
        error.statusCode
          ? error.message
          : 'No se pudo crear la solicitud logística'
    });
  }
});

// ============================================================
// MIS SOLICITUDES
// GET /api/logistics/requests/mine
// ============================================================

router.get('/requests/mine', async (req, res) => {
  try {
    const requests =
      await getMyRequests(req.user.id);

    return res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error(
      '❌ GET /api/logistics/requests/mine:',
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      error:
        error.statusCode
          ? error.message
          : 'No se pudieron obtener tus solicitudes'
    });
  }
});

// ============================================================
// SOLICITUD POR ID
// GET /api/logistics/requests/:requestId
// ============================================================

router.get(
  '/requests/:requestId',
  async (req, res) => {
    try {
      const request =
        await getServiceRequest(
          req.params.requestId,
          req.user.id
        );

      return res.json({
        success: true,
        request
      });

    } catch (error) {
      console.error(
        '❌ GET /api/logistics/requests/:requestId:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudo obtener la solicitud'
      });
    }
  }
);

// ============================================================
// SOLICITUDES DISPONIBLES PARA PRESTADORES
// GET /api/logistics/requests/available
// ============================================================

router.get(
  '/requests/available',
  async (req, res) => {
    try {
      const requests =
        await getAvailableRequests(
          req.user.id
        );

      return res.json({
        success: true,
        requests
      });

    } catch (error) {
      console.error(
        '❌ GET /api/logistics/requests/available:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudieron obtener las solicitudes disponibles'
      });
    }
  }
);

// ============================================================
// CREAR OFERTA
// POST /api/logistics/requests/:requestId/offers
// ============================================================

router.post(
  '/requests/:requestId/offers',
  async (req, res) => {
    try {
      const offer =
        await createOffer(
          req.params.requestId,
          req.user.id,
          req.body || {}
        );

      return res.status(201).json({
        success: true,
        offer
      });

    } catch (error) {
      console.error(
        '❌ POST /api/logistics/requests/:requestId/offers:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudo crear la oferta'
      });
    }
  }
);

// ============================================================
// LISTAR OFERTAS DE UNA SOLICITUD
// GET /api/logistics/requests/:requestId/offers
// ============================================================

router.get(
  '/requests/:requestId/offers',
  async (req, res) => {
    try {
      const offers =
        await getOffers(
          req.params.requestId,
          req.user.id
        );

      return res.json({
        success: true,
        offers
      });

    } catch (error) {
      console.error(
        '❌ GET /api/logistics/requests/:requestId/offers:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudieron obtener las ofertas'
      });
    }
  }
);

// ============================================================
// ACEPTAR OFERTA
// POST /api/logistics/requests/:requestId/offers/:offerId/accept
// ============================================================

router.post(
  '/requests/:requestId/offers/:offerId/accept',
  async (req, res) => {
    try {
      const offer =
        await acceptOffer(
          req.params.requestId,
          req.params.offerId,
          req.user.id
        );

      return res.json({
        success: true,
        message: 'Oferta aceptada',
        offer
      });

    } catch (error) {
      console.error(
        '❌ POST /api/logistics/requests/:requestId/offers/:offerId/accept:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudo aceptar la oferta'
      });
    }
  }
);

// ============================================================
// RETIRAR OFERTA
// DELETE /api/logistics/offers/:offerId
// ============================================================

router.delete(
  '/offers/:offerId',
  async (req, res) => {
    try {
      const offer =
        await withdrawOffer(
          req.params.offerId,
          req.user.id
        );

      return res.json({
        success: true,
        message: 'Oferta retirada',
        offer
      });

    } catch (error) {
      console.error(
        '❌ DELETE /api/logistics/offers/:offerId:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudo retirar la oferta'
      });
    }
  }
);

// ============================================================
// MIS OFERTAS
// GET /api/logistics/offers/mine
// ============================================================

router.get(
  '/offers/mine',
  async (req, res) => {
    try {
      const offers =
        await getMyOffers(
          req.user.id
        );

      return res.json({
        success: true,
        offers
      });

    } catch (error) {
      console.error(
        '❌ GET /api/logistics/offers/mine:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudieron obtener tus ofertas'
      });
    }
  }
);

// ============================================================
// ACTUALIZAR DISPONIBILIDAD
// PATCH /api/logistics/provider/availability
// ============================================================

router.patch(
  '/provider/availability',
  async (req, res) => {
    try {
      const provider =
        await updateProviderAvailability(
          req.user.id,
          req.body || {}
        );

      return res.json({
        success: true,
        provider
      });

    } catch (error) {
      console.error(
        '❌ PATCH /api/logistics/provider/availability:',
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        error:
          error.statusCode
            ? error.message
            : 'No se pudo actualizar la disponibilidad'
      });
    }
  }
);

// ============================================================
// MI PERFIL DE PRESTADOR
// GET /api/logistics/provider/me
// ============================================================

router.get(
  '/provider/me',
  async (req, res) => {
    try {
      const provider =
        await getProviderByUserId(
          req.user.id
        );

      if (!provider) {
        return res.status(404).json({
          success: false,
          error:
            'No tenés un perfil de prestador de logística'
        });
      }

      return res.json({
        success: true,
        provider
      });

    } catch (error) {
      console.error(
        '❌ GET /api/logistics/provider/me:',
        error
      );

      return res.status(500).json({
        success: false,
        error:
          'No se pudo obtener el perfil de prestador'
      });
    }
  }
);

module.exports = router;
