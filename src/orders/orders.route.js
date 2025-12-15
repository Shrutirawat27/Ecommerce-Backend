const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const verifyToken = require('../middleware/verifyToken'); // adjust path if needed
const {
  getOrders,
  createOrder,
  updateOrderStatus
} = require('./orders.controller');

/* =========================
   DEBUG ROUTE (UNCHANGED)
========================= */
router.post('/checkout-debug', async (req, res) => {
  try {
    const { userId, products, totalAmount, deliveryInfo } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: 'Missing userId',
        receivedValue: userId,
        valueType: typeof userId
      });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);

    return res.status(200).json({
      message: 'Debug info',
      userIdReceived: userId,
      isValidObjectId,
      productsCount: products?.length || 0,
      deliveryInfoComplete: Boolean(
        deliveryInfo?.firstName &&
        deliveryInfo?.lastName &&
        deliveryInfo?.email &&
        deliveryInfo?.address?.street
      )
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error in debug checkout',
      error: error.message
    });
  }
});

/* =========================
   REAL ROUTES
========================= */

// USER + ADMIN (filtered inside controller)
router.get('/', verifyToken, getOrders);

// USER creates order
router.post('/', verifyToken, createOrder);

// ADMIN updates order status
router.patch('/:id', verifyToken, updateOrderStatus);

module.exports = router;
