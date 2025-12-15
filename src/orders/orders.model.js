const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipcode: { type: String, required: true },
  country: { type: String, required: true }
}, { _id: false });

const deliveryInfoSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: addressSchema, required: true },
  phone: { type: String, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  products: [
    {
      // 🔹 Optional reference (good for analytics)
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },

      // 🔹 SNAPSHOT DATA (VERY IMPORTANT)
      name: { type: String, required: true },
      price: { type: Number, required: true },
      image: { type: String, required: true },

      quantity: { type: Number, required: true, min: 1 }
    }
  ],

  totalAmount: { type: Number, required: true },

  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Delivered'],
    default: 'Pending'
  },

  deliveryInfo: { type: deliveryInfoSchema, required: true },

  paymentMethod: {
    type: String,
    enum: ['stripe', 'razorpay', 'cod'],
    default: 'cod'
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
