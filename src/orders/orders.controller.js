const Order = require('./orders.model');
const mongoose = require('mongoose');

/* Get Orders */
const getOrders = async (req, res) => {
  try {
    // console.log("Fetching orders for user:", req.user);

    let filter = {};
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id instanceof mongoose.Types.ObjectId
        ? req.user._id
        : new mongoose.Types.ObjectId(req.user._id);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'username email')
      .populate({
        path: 'products.productId',
        select: 'name image1 price'
      });

    // console.log(`Found ${orders.length} orders for userId=${req.user._id}`);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};


/* Create Order */
const createOrder = async (req, res) => {
  try {
    const { products, totalAmount, deliveryInfo, paymentMethod = 'cod' } = req.body;
    const userId = req.user._id;

    console.log("Creating order for user:", userId);

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.productId || !mongoose.Types.ObjectId.isValid(product.productId)) {
        return res.status(400).json({ error: `Invalid productId at products[${i}]` });
      }
      if (!product.quantity || product.quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity at products[${i}]` });
      }
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: 'Total amount must be greater than 0' });
    }

    if (!deliveryInfo || !deliveryInfo.address || !deliveryInfo.firstName || !deliveryInfo.lastName) {
      return res.status(400).json({ error: 'Complete delivery info is required' });
    }

    const newOrder = new Order({
      userId,
      products,
      totalAmount,
      deliveryInfo,
      paymentMethod,
      status: 'Pending',
      orderDate: new Date()
    });

    const savedOrder = await newOrder.save();

    console.log("Order created:", savedOrder._id);
    res.status(201).json({
      message: 'Order placed successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: 'Error creating order' });
  }
};

/* Update Order Status - Admin only */
const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Shipped', 'Delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('userId', 'username email')
      .populate({
        path: 'products.productId',
        select: 'name image1 price'
      });

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log("Order status updated:", updatedOrder._id, "to", status);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: 'Error updating order' });
  }
};

module.exports = { getOrders, createOrder, updateOrderStatus };