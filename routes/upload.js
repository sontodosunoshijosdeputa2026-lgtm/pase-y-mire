const express = require('express');

const router = express.Router();

// ============================================================
// UPLOAD
// ============================================================

router.post('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Almacenamiento delegado a Supabase Storage'
  });
});

module.exports = router;
