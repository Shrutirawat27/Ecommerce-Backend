const express = require('express');
const router = express.Router();
const { getOrders, createOrder, updateOrderStatus } = require('./orders.controller');
const mongoose = require('mongoose');

// Debug route for order checkout
router.post('/checkout-debug', async (req, res) => {
  try {
    console.log("Debug checkout route called");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Auth header:", req.headers.authorization);
    
    const { userId, products, totalAmount, deliveryInfo } = req.body;
    
    // Basic validation
    if (!userId) {
      return res.status(400).json({ 
        message: 'Missing userId', 
        receivedValue: userId,
        valueType: typeof userId 
      });
    }
    
    // Check if userId is a valid ObjectId
    let isValidObjectId = false;
    try {
      isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    } catch (error) {
      console.error("Error validating ObjectId:", error);
    }
    
    return res.status(200).json({
      message: 'Debug info',
      userIdReceived: userId,
      userIdType: typeof userId,
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
    console.error("Debug checkout error:", error);
    return res.status(500).json({ 
      message: 'Error in debug checkout', 
      error: error.message 
    });
  }
});

router.get('/', getOrders);  // Fetch orders
router.post('/', createOrder); // Place an order - changed from /create to / to match frontend
router.patch('/:id', updateOrderStatus); // Update order status

module.exports = router;
