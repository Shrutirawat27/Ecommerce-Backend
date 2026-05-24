const Wishlist = require('./wishlist.model');
const Product = require('../products/products.model');

const getWishlist = async (req, res) => {

  try {

    const wishlist = await Wishlist.findOne({
      user: req.user._id
    });

    if (!wishlist) {

      return res.json({
        products: []
      });
    }

    const products = await Promise.all(

      wishlist.products.map(async (item) => {

        const product =
          await Product.findById(
            item.productId
          );

        return product;
      })
    );

    res.json({
      products: products.filter(Boolean)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch wishlist'
    });
  }
};

const toggleWishlist = async (req, res) => {

  try {

    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({
      user: req.user._id
    });

    if (!wishlist) {

      wishlist = await Wishlist.create({
        user: req.user._id,
        products: []
      });
    }

    const exists = wishlist.products.find(

      (p) =>
        p.productId.toString() === productId
    );

    if (exists) {

      wishlist.products =
        wishlist.products.filter(

          (p) =>
            p.productId.toString() !== productId
        );

    } else {

      wishlist.products.push({
        productId
      });
    }

    await wishlist.save();

    const updatedProducts = await Promise.all(

      wishlist.products.map(async (item) => {

        const product =
          await Product.findById(
            item.productId
          );

        return product;
      })
    );

    res.json({
      success: true,
      products: updatedProducts.filter(Boolean)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: 'Failed to update wishlist'
    });
  }
};

module.exports = {
  getWishlist,
  toggleWishlist
};