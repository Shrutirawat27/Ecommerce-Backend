const Order = require('./orders.model');
const mongoose = require('mongoose');

// Fetch all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')  
      .populate({
        path: 'products.productId',
        select: 'name image1 price'  // Ensure image1 is included
      })
      .lean();  // Convert to plain JSON for better response handling

    console.log("Orders from DB:", orders);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// Place a new order
const createOrder = async (req, res) => {
  try {
    console.log('Order data received:', JSON.stringify(req.body, null, 2));
    
    const { userId, products, totalAmount, deliveryInfo, paymentMethod = 'cod' } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'products must be a non-empty array' });
    }
    
    if (totalAmount === undefined || totalAmount === null) {
      return res.status(400).json({ error: 'totalAmount is required' });
    }
    
    if (!deliveryInfo) {
      return res.status(400).json({ error: 'deliveryInfo is required' });
    }
    
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }
    
    // Validate products array
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (!product.productId) {
        return res.status(400).json({ error: `Missing productId in products[${i}]` });
      }
      
      if (!mongoose.Types.ObjectId.isValid(product.productId)) {
        return res.status(400).json({ error: `Invalid productId format in products[${i}]` });
      }
      
      if (!product.quantity) {
        return res.status(400).json({ error: `Missing quantity in products[${i}]` });
      }
      
      if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
        return res.status(400).json({ error: `Quantity must be a positive integer in products[${i}]` });
      }
    }
    
    // Validate totalAmount
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ error: 'totalAmount must be a positive number' });
    }
    
    // Validate deliveryInfo
    const requiredDeliveryFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    for (const field of requiredDeliveryFields) {
      if (!deliveryInfo[field]) {
        return res.status(400).json({ error: `Missing ${field} in deliveryInfo` });
    }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(deliveryInfo.email)) {
      return res.status(400).json({ error: 'Invalid email format in deliveryInfo' });
    }
    
    // Validate phone format (basic validation)
    if (!/^\d{10,15}$/.test(deliveryInfo.phone.replace(/[^0-9]/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number format in deliveryInfo' });
    }
    
    // Validate address
    const requiredAddressFields = ['street', 'city', 'state', 'zipcode', 'country'];
    for (const field of requiredAddressFields) {
      if (!deliveryInfo.address[field]) {
        return res.status(400).json({ error: `Missing ${field} in deliveryInfo.address` });
      }
    }
    
    // Validate payment method if provided
    if (paymentMethod && !['stripe', 'razorpay', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method. Must be one of: stripe, razorpay, cod' });
    }
    
    // Create the order object
    const orderData = {
      userId,
      products,
      totalAmount,
      deliveryInfo,
      orderDate: new Date(),
      status: 'Pending'
    };
    
    // Add payment method if provided
    if (paymentMethod) {
      orderData.paymentMethod = paymentMethod;
    }
    
    // Create and save the order
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    res.status(201).json({
      message: 'Order created successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: 'Validation error', details: validationErrors });
    }
    
    res.status(500).json({ error: 'Error creating order', message: error.message });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Pending', 'Shipped', 'Delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).populate('userId', 'name email')
      .populate({
        path: 'products.productId',
        select: 'name image1 price'
      });

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

module.exports = { getOrders, createOrder, updateOrderStatus };
