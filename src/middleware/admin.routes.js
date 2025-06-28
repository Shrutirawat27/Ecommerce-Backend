const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const router = express.Router();

// Admin registration route
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingAdmin = await User.findOne({ email, role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }
        const newAdmin = new User({
            username,
            email,
            password, 
            role: 'admin'
        });

        await newAdmin.save();
        res.status(201).json({ message: 'Admin registered successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, role: 'admin' });
        if (!user) {
            return res.status(400).json({ message: 'Admin user not found' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '24h' } 
        );

        const refreshToken = jwt.sign(
            { userId: user._id, role: user.role },
            refreshSecret,
            { expiresIn: '7d' } 
        );

        res.json({ token, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }
       
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';
        
        const decoded = jwt.verify(refreshToken, refreshSecret);
        
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') {
            return res.status(404).json({ message: 'Admin user not found' });
        }
        
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '24h' }
        );
        
        const newRefreshToken = jwt.sign(
            { userId: user._id, role: user.role },
            refreshSecret,
            { expiresIn: '7d' }
        );
        
        res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token has expired, please login again' });
        }
        
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

const authenticateAdmin = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }
    console.log("Token Extracted in Admin Routes:", token);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        //console.log("Decoded Admin Routes Token:", decoded);
        req.user = decoded;
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden, not an admin' });
        }

        next();
    } catch (error) {
        console.error("Admin auth error:", error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token has expired', 
                needsRefresh: true 
            });
        }
        res.status(401).json({ message: 'Invalid token' });
    }
};

router.use(authenticateAdmin);

router.get('/dashboard', (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard!' });
});

module.exports = router;