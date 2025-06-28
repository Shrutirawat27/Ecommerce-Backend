const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    image1: { type: String, required: true }, 
    color: { type: String },
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
});

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;