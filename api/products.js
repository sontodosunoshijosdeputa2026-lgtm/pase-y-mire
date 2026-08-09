const express = require('express');
const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

function normalizeProduct(row, seller = null) {
  return {
    id: row.id,
    title: row.title ?? row.name ?? 'Publicación',
    description: row.description ?? '',
    price: Number(row.price ?? row.amount ?? 0),
    category: row.category ?? row.category_name ?? 'General',

    images:
      Array.isArray(row.images)
        ? row.images
        : row.image_url
          ? [row.image_url]
          : row.image
            ? [row.image]
            : [],

    views: Number(row.views ?? 0),

    createdAt:
      row.created_at ??
      row.createdAt ??
      new Date().toISOString(),

    seller: {
      id:
        seller?.id ??
        row.seller_id ??
        row.user_id ??
        row.owner_id ??
        null,

      name:
        seller?.name ??
        row.seller_name ??
        'Usuario',

      avatar:
        seller?.avatar ??
        row.seller_avatar ??
        row.avatar ??
        '/public/assets/default-avatar.png',

      verified:
        Boolean(
          seller?.verified ??
          row.seller_verified ??
          false
        ),

      rating:
        Number(
          seller?.rating ??
          row.seller_rating ??
          5
        )
    }
  };
}

// GET /api/marketplace/products
router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Marketplace:', error);

      return res.status(500).json({
        success: false,
        error: error.message,
        data: []
      });
    }

    const sellerIds = [
      ...new Set(
        data
          .map(p => p.seller_id ?? p.user_id ?? p.owner_id)
          .filter(Boolean)
      )
    ];

    let sellers = {};

    if (sellerIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id,name,avatar,verified,rating')
        .in('id', sellerIds);

      for (const user of users || []) {
        sellers[user.id] = user;
      }
    }

    const products = data.map(product => {
      const sellerId =
        product.seller_id ??
        product.user_id ??
        product.owner_id;

      return normalizeProduct(
        product,
        sellers[sellerId] || null
      );
    });

    res.json(products);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'No se pudieron cargar las publicaciones'
    });
  }
});

// GET /api/marketplace/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        error: 'Publicación no encontrada'
      });
    }

    const sellerId =
      product.seller_id ??
      product.user_id ??
      product.owner_id;

    let seller = null;

    if (sellerId) {
      const { data } = await supabase
        .from('users')
        .select('id,name,avatar,verified,rating')
        .eq('id', sellerId)
        .maybeSingle();

      seller = data;
    }

    res.json(normalizeProduct(product, seller));

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Error cargando publicación'
    });
  }
});

module.exports = router;
