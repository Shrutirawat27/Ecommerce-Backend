require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cloudinary = require('./config/cloudinary');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 


const Product = require('./src/products/products.model');

// Middleware setup
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:3000', 
  'http://localhost:5175',
  'https://ecommerce-frontend-zeta-kohl.vercel.app/'
];

app.use(cors({
  origin: 'https://ecommerce-frontend-zeta-kohl.vercel.app/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Content-Type-Options']
}));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Add debugging middleware for static file requests
app.use((req, res, next) => {
  if (req.url.startsWith('/uploads')) {
    console.log('Static file request:', req.url);
    console.log('Looking in:', path.join(__dirname, 'public', req.url));
  }
  next();
});

// Add global request logger for debugging
app.use((req, res, next) => {
  // Only log API requests
  if (req.url.startsWith('/api')) {
    const requestLog = {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    };
    
    console.log('\n🔍 Request:', JSON.stringify(requestLog, null, 2));
    
    // Capture and log response
    const originalSend = res.send;
    res.send = function(body) {
      console.log(`📤 Response ${res.statusCode}:`, 
        typeof body === 'object' ? JSON.stringify(body).substring(0, 150) + '...' : body);
      return originalSend.apply(this, arguments);
    };
  }
  next();
});

// Allow all preflight requests
app.options('*', cors());

// Search route for products
app.get('/api/products/search', async (req, res) => {
  const { searchQuery } = req.query;

  if (!searchQuery || !searchQuery.trim()) {
    return res.json([]); // ✅ Returns an empty array instead of an error
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


// Routes
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve any static files from the frontend build directory
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // For any other route, send the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Server is running in development mode');
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
