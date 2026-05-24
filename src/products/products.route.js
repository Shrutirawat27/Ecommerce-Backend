const express = require('express');
const mongoose = require('mongoose');
const Products = require('./products.model');
const Reviews = require('../reviews/reviews.model');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const upload = require('../middleware/multer');
const { cloudinary } = require("../../config/cloudinary");
const router = express.Router();

// Create product
router.post("/create-product", verifyToken, verifyAdmin, upload.single('image1'), async (req, res) => {
  try {
    const newProduct = new Products({
      ...req.body,
      image1: req.file?.path || "", 
      author: req.user._id
    });

    const savedProduct = await newProduct.save();

    const reviews = await Reviews.find({ productId: savedProduct._id });
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      savedProduct.rating = totalRating / reviews.length;
      await savedProduct.save();
    }

    res.status(201).send(savedProduct);
  } catch (error) {
    console.error("Error creating new product", error);
    res.status(500).send({ message: "Failed to create new product", error: error.message });
  }
});

// Get products 
router.get("/", async (req, res) => {
  try {
    const { category, color, minPrice, maxPrice, page = 1, limit = 10, isAdmin } = req.query;
    let filter = {};

    if (category && category !== "all") filter.category = new RegExp(`^${category}$`, "i");
    if (color && color !== "all") filter.color = new RegExp(`^${color}$`, "i");

    if (minPrice || maxPrice) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = parseFloat(minPrice);
      if (!isNaN(maxPrice)) filter.price.$lte = parseFloat(maxPrice);
    }

    if (isAdmin === "true") {
      const products = await Products.find(filter).sort({ createdAt: -1 }).populate("author", "email");
      return res.status(200).send({ products, totalProducts: products.length });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalProducts = await Products.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Products.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "email");

    res.status(200).send({ products, totalPages, totalProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Error fetching products" });
  }
});

// Get product by ID
router.get("/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).send({ message: "Invalid product ID" });
    }

    const product = await Products.findById(_id)
  .populate("author", "email username")
  .populate({
    path: "reviews",
    populate: { path: "userId", select: "username" }
  });

    if (!product) return res.status(404).send({ message: "Product not found" });

    res.status(200).send(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).send({ message: "Error fetching product" });
  }
});

// Update product
router.patch("/update-product/:_id", verifyToken, verifyAdmin, upload.single('image1'), async (req, res) => {
  try {
    const productId = req.params._id;
    let updatedFields = { ...req.body };

    if (req.file) {
      updatedFields.image1 = req.file.path;
    }

    const updatedProduct = await Products.findByIdAndUpdate(productId, updatedFields, { new: true });
    if (!updatedProduct) return res.status(404).send({ message: "Product not found" });

    res.status(200).send({ message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product", error);
    res.status(500).send({ message: "Failed to update the product" });
  }
});

// Delete product
router.delete("/:_id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const productId = req.params._id;
    const deletedProduct = await Products.findByIdAndDelete(productId);
    if (!deletedProduct) return res.status(404).send({ message: "Product not found" });

    if (deletedProduct.image1) {
      const parts = deletedProduct.image1.split('/');
      const publicIdWithExtension = parts[parts.length - 1];
      const publicId = `ecommerce-products/${publicIdWithExtension.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    }

    await Reviews.deleteMany({ productId });
    res.status(200).send({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product", error);
    res.status(500).send({ message: "Failed to delete the product" });
  }
});

// Related products
router.get("/related/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).send({ message: "Invalid product ID" });

    const product = await Products.findById(_id);
    if (!product) return res.status(404).send({ message: "Product not found" });

    const titleRegex = new RegExp(
      product.name.split(" ").filter(word => word.length > 1).join("|"), "i"
    );

    const relatedProducts = await Products.find({
      _id: { $ne: _id },
      $or: [
        { name: { $regex: titleRegex } },
        { category: product.category }
      ]
    });

    res.status(200).send(relatedProducts);
  } catch (error) {
    console.error("Error fetching related products", error);
    res.status(500).send({ message: "Failed to fetch related products" });
  }
});

module.exports = router;