const express = require('express');
const mongoose = require('mongoose');
const Products = require('./products.model');
const Reviews = require('../reviews/reviews.model');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const upload = require('../middleware/multer');
const cloudinary = require("../../config/cloudinary");

const router = express.Router();

// post a product
router.post("/create-product", verifyToken, verifyAdmin, upload.single('image1'), async (req, res) => {
    try {

        console.log("Received authorId:", req.user._id);

        let imageUrl = ""; 

      // If an image file is uploaded, upload it to Cloudinary
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        imageUrl = result.secure_url; // Get the uploaded image URL
    }

        const newProduct = new Products({
            ...req.body,
            image1: imageUrl,
            author: req.user._id
        });

        const savedProduct = await newProduct.save();
        
        // calculate review
        const reviews = await Reviews.find({productId: savedProduct._id});
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        
            const averageRating = totalRating / reviews.length;
            savedProduct.rating = averageRating;
            await savedProduct.save();
        };
        
        res.status(201).send(savedProduct);
    } catch (error) {
        console.error("Error creating new product", error);
        res.status(500).send({ message: "Failed to create new product", error: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const { category, color, minPrice, maxPrice, page = 1, limit = 10, isAdmin } = req.query;

        let filter = {};
        if (category && category !== "all") {
            filter.category = new RegExp(`^${category}$`, "i"); // Case-insensitive
        }
        if (color && color !== "all") {
            filter.color = new RegExp(`^${color}$`, "i"); // Case-insensitive
        }        
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) {
                const min = parseFloat(minPrice);
                if (!isNaN(min)) {
                    filter.price.$gte = min;
                }
            }
            if (maxPrice) {
                const max = parseFloat(maxPrice);
                if (!isNaN(max)) {
                    filter.price.$lte = max;
                }
            }
        }
        

        // ✅ Admin Side: No Pagination, Return All Products
        if (isAdmin && isAdmin.toString() === "true") {
            console.log("Admin request detected. Returning all products without pagination.");
            const products = await Products.find(filter)
                .sort({ createdAt: -1 }) // Sort by latest
                .populate("author", "email");
        
            return res.status(200).send({ products, totalProducts: products.length });
        }
        

        // ✅ Shop Page: Apply Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const totalProducts = await Products.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / parseInt(limit));

        const products = await Products.find(filter)
            .sort({ createdAt: -1, _id: -1 }) // Sort by latest
            .skip(skip)
            .limit(parseInt(limit))
            .populate("author", "email");

        res.status(200).send({ products, totalPages, totalProducts });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send({ message: "Error fetching products" });
    }
});




// get single product
router.get("/:_id", async (req, res) => {
    try {
        const { _id } = req.params;
        console.log("Requested Product ID:", _id);


        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).send({ message: "Invalid product ID" });
        }

        const product = await Products.findById(_id).populate("author", "email username");

        if (!product) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.status(200).send(product);
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        res.status(500).send({ message: "Error fetching product" });
    }
});

// update a product
router.patch("/update-product/:_id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const productId = req.params._id;
        let updatedFields = { ...req.body };

        // If an image file is uploaded, update image1 in Cloudinary
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            updatedFields.image1 = result.secure_url;
        }
        const updatedProduct = await Products.findByIdAndUpdate(productId, { ...req.body }, { new: true });

        if (!updatedProduct) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.status(200).send({
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Error updating the product", error);
        res.status(500).send({ message: "Failed to update the product" });
    }
});

// delete a product
router.delete("/:_id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const productId = req.params._id;
        const deletedProduct = await Products.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).send({ message: "Product not found" });
        }

        // ✅ Delete image from Cloudinary
        if (deletedProduct.image1) {
            const imagePublicId = deletedProduct.image1.split("/").pop().split(".")[0]; // Extract public_id
            await cloudinary.uploader.destroy(imagePublicId);
        }

        // ✅ Delete reviews related to the product
        await Reviews.deleteMany({ productId });

        res.status(200).send({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting the product", error);
        res.status(500).send({ message: "Failed to delete the product" });
    }
});


// get related products
router.get("/related/:_id", async (req, res) => {
    try {
        const { _id } = req.params;

        if (!_id) {
            return res.status(400).send({ message: "Product ID is required" });
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).send({ message: "Invalid product ID" });
        }

        const product = await Products.findById(_id);
        if (!product) {
            return res.status(404).send({ message: "Product not found" });
        }

        const titleRegex = new RegExp(
            product.name
                .split(" ")
                .filter((word) => word.length > 1)
                .join("|"),
            "i"
        );

        const relatedProducts = await Products.find({
            _id: { $ne: _id },
            $or: [{ name: { $regex: titleRegex } }, { category: product.category }],
        });

        res.status(200).send(relatedProducts);
    } catch (error) {
        console.error("Error fetching the related product", error);
        res.status(500).send({ message: "Failed to fetch the related product" });
    }
});

module.exports = router;
