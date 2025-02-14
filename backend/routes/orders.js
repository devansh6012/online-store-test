// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Create new order
router.post('/', authMiddleware, async (req, res) => {
  const { items, totalAmount, shippingDetails } = req.body;
  const userId = req.user.id;

  try {
    // Start transaction
    await db.query('START TRANSACTION');

    // Create order
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, total_amount, status, shipping_address, shipping_city, shipping_postal_code, shipping_phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        totalAmount,
        'pending',
        shippingDetails.address,
        shippingDetails.city,
        shippingDetails.postalCode,
        shippingDetails.phone
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    const orderItems = items.map(item => [
      orderId,
      item.id,
      item.quantity,
      item.price
    ]);

    await db.query(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
      [orderItems]
    );

    // Update product stock
    for (const item of items) {
      await db.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    // Commit transaction
    await db.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Get user's orders
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, 
             COUNT(oi.id) as total_items,
             GROUP_CONCAT(p.name) as product_names
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json(orders);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get single order details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Get order details
    const [orders] = await db.query(`
      SELECT o.*, 
             JSON_OBJECT(
               'fullName', CONCAT(u.first_name, ' ', u.last_name),
               'email', u.email
             ) as user_details
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `, [req.params.id, req.user.id]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const [orderItems] = await db.query(`
      SELECT oi.*, p.name, p.images
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    const order = orders[0];
    order.items = orderItems;
    order.user_details = JSON.parse(order.user_details);

    res.json(order);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching order details' });
  }
});

// Update order status (for admin)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  try {
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

module.exports = router;