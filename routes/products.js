const express = require('express');
const db = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../utils/jwt');

const router = express.Router();

// ============================================================
// OBTENER TODOS LOS PRODUCTOS
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    let query = 'SELECT * FROM products WHERE active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const products = await db.all(query, params);

    return res.json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener los productos'
    });
  }
});

// ============================================================
// OBTENER PRODUCTO POR ID
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.get(
      'SELECT * FROM products WHERE id = ? AND active = 1',
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    return res.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener el producto'
    });
  }
});

// ============================================================
// CREAR PRODUCTO (Solo vendedores/admin)
// ============================================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock } = req.body;

    // Validar que sea vendedor o admin
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo vendedores pueden crear productos'
      });
    }

    // Validar campos
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y precio son requeridos'
      });
    }

    const result = await db.run(
      `INSERT INTO products (name, description, price, category, image_url, seller_id, stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, price, category || 'General', image_url || null, req.user.id, stock || 0]
    );

    const product = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [result.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });

  } catch (error) {
    console.error('❌ Error creando producto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear el producto'
    });
  }
});

// ============================================================
// ACTUALIZAR PRODUCTO
// ============================================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image_url, stock, active } = req.body;

    // Verificar que el producto existe
    const product = await db.get(
      'SELECT seller_id FROM products WHERE id = ?',
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Verificar permisos (solo el vendedor o admin)
    if (req.user.role !== 'admin' && req.user.id !== product.seller_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para actualizar este producto'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(image_url);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      values.push(stock);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active ? 1 : 0);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedProduct = await db.get(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Producto actualizado',
      product: updatedProduct
    });

  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar el producto'
    });
  }
});

// ============================================================
// ELIMINAR PRODUCTO (Soft delete)
// ============================================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.get(
      'SELECT seller_id FROM products WHERE id = ?',
      [id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== product.seller_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para eliminar este producto'
      });
    }

    await db.run(
      'UPDATE products SET active = 0 WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Producto eliminado'
    });

  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar el producto'
    });
  }
});

// ============================================================
// OBTENER CATEGORÍAS
// ============================================================
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await db.all(
      'SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category'
    );

    const categoryList = categories.map(c => c.category);

    return res.json({
      success: true,
      categories: categoryList
    });

  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener las categorías'
    });
  }
});

module.exports = router;
