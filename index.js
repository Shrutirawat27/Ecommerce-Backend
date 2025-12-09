require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cloudinary = require('./config/cloudinary');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const Product = require('./src/products/products.model');

// Allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5175',
  'https://ecommerce-frontend-pa3brq7dw-shruti-rawats-projects.vercel.app',
  'https://ecommerce-frontend-xi-dun.vercel.app',
  'https://herstyle-ecommerce.vercel.app'

];

// Configure CORS securely
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); 
    } else {
      callback(new Error("CORS not allowed from this origin: " + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length']
}));

// Middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Cleaned up static file logger
app.use((req, res, next) => {
  // if (req.url.startsWith('/uploads')) {
  //   console.log('Static file request:', req.url);
  //   console.log('Looking in:', path.join(__dirname, 'public', req.url));
  // }
  next();
});

// Cleaned up API response logger
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    // const requestLog = {
    //   method: req.method,
    //   url: req.url,
    //   contentType: req.headers['content-type'],
    //   userAgent: req.headers['user-agent']
    // };

    // console.log('\n Request:', JSON.stringify(requestLog, null, 2));

    const originalSend = res.send;
    res.send = function (body) {
      // Commented out response logging
      // console.log(` Response ${res.statusCode}:`,
      //   typeof body === 'object' ? JSON.stringify(body).substring(0, 150) + '...' : body);
      return originalSend.apply(this, arguments);
    };
  }
  next();
});

// Product search route
app.get('/api/products/search', async (req, res) => {
  const { searchQuery } = req.query;

  if (!searchQuery || !searchQuery.trim()) {
    return res.json([]);
  }

  try {
    const products = await Product.find({
      name: { $regex: searchQuery, $options: 'i' },
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong while searching.' });
  }
});

// Import routes
const authRoutes = require('./src/users/user.route');
const productRoutes = require("./src/products/products.route");
const reviewRoutes = require("./src/reviews/reviews.router");
const adminRoutes = require('./src/middleware/admin.routes');
const orderRoutes = require('./src/orders/orders.route');

app.use('/api/user', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

// MongoDB connection
async function main() {
  if (!process.env.DB_URL) {
    console.error("Error: DB_URL is not defined in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("MongoDB is successfully connected.");
}

main().catch(err => console.error("MongoDB Connection Error:", err));

// Serve a basic message in production as well
app.get('/', (req, res) => {
  res.send('E-commerce backend is live');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});