const Cart = require('./cartModel');
const Product = require('../products/products.model');

// Get user cart
const getCart = async (req, res) => {
  try {

    const cart = await Cart.findOne({
      user: req.user._id
    });

    if (!cart) {
      return res.json({
        products: []
      });
    }

    const productIds = cart.products.map(
  (item) => item.productId
);

const dbProducts = await Product.find({
  _id: { $in: productIds }
});

const productMap = dbProducts.reduce(
  (acc, product) => {

    acc[product._id.toString()] = product;

    return acc;
  },
  {}
);

const productsWithDetails = cart.products.map(
  (item) => {

    const product =
      productMap[
        item.productId.toString()
      ];

    if (!product) return null;

    return {
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image1,
      quantity: item.quantity,
    };
  }
);

    res.json({
      products: productsWithDetails.filter(Boolean)
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Failed to fetch cart'
    });
  }
};

// Update cart
const updateCart = async (req, res) => {
  try {

    const { products } = req.body;

    let cart = await Cart.findOne({
      user: req.user._id
    });

    const backendProducts = products.map(p => ({
      productId: p._id,
      quantity: p.quantity
    }));

    if (!backendProducts.length) {

      await Cart.findOneAndDelete({
        user: req.user._id
      });

      return res.json({
        products: []
      });
    }

    if (!cart) {

      cart = await Cart.create({
        user: req.user._id,
        products: backendProducts
      });

    } else {

      cart.products = backendProducts;

      await cart.save();
    }

    const productIds = cart.products.map(
  (item) => item.productId
);

const dbProducts = await Product.find({
  _id: { $in: productIds }
});

const productMap = dbProducts.reduce(
  (acc, product) => {

    acc[product._id.toString()] = product;

    return acc;
  },
  {}
);

const productsWithDetails = cart.products.map(
  (item) => {

    const product =
      productMap[
        item.productId.toString()
      ];

    if (!product) return null;

    return {
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image1,
      quantity: item.quantity,
    };
  }
);

    res.json({
      products: productsWithDetails.filter(p => p)
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Failed to update cart'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {

    await Cart.findOneAndDelete({
      user: req.user._id
    });

    res.json({
      message: 'Cart cleared'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Failed to clear cart'
    });
  }
};

module.exports = { getCart, updateCart, clearCart };