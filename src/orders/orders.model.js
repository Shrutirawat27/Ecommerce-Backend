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
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product',  
        required: true 
      },
      quantity: { type: Number, required: true, min: 1 }
    }
  ],
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
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

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;