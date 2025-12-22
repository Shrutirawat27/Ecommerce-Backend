const Cart = require('./cartModel');
const Product = require('../products/products.model');

// Get user cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, products: [] });
    }

    const productsWithDetails = await Promise.all(
      cart.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) return null;
        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          image: product.image1,
          quantity: item.quantity,
        };
      })
    );

    res.json({ products: productsWithDetails.filter(p => p) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

// Update cart
const updateCart = async (req, res) => {
  try {
    const { products } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });

    const backendProducts = products.map(p => ({
      productId: p._id,
      quantity: p.quantity
    }));

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, products: backendProducts });
    } else {
      cart.products = backendProducts;
      await cart.save();
    }

    const productsWithDetails = await Promise.all(
      cart.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) return null;
        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          image: product.image1,
          quantity: item.quantity,
        };
      })
    );

    res.json({ products: productsWithDetails.filter(p => p) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update cart' });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { products: [] }, { new: true });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, updateCart, clearCart };