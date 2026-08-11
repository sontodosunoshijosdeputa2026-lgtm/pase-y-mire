const rateLimit = require('express-rate-limit');

const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test';
};

const createLimiter = ({
  windowMs,
  limit,
  message
}) => {
  return rateLimit({
    windowMs,
    limit,

    standardHeaders: 'draft-7',
    legacyHeaders: false,

    message: {
      success: false,
      error: message
    },

    skip: isTestEnvironment
  });
};

// Límite general para APIs.
const apiRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  message: 'Demasiadas solicitudes. Intentá nuevamente más tarde.'
});

// Límite específico para autenticación.
const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  message:
    'Demasiados intentos de autenticación. Intentá nuevamente más tarde.'
});

// Límite para operaciones de subida de archivos.
const uploadRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 60),
  message:
    'Demasiadas operaciones de subida. Intentá nuevamente más tarde.'
});

module.exports = {
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  createLimiter
};
