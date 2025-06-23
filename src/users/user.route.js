const jwt = require('jsonwebtoken');
const express = require('express');
const User = require('./user.model');
const generateToken = require('../middleware/generateToken');
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/profiles');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  }
});

// Add middleware to log all requests to edit-profile endpoint
router.use('/edit-profile', (req, res, next) => {
  console.log('\n[DEBUG] Edit Profile Request:');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('Content type is multipart/form-data - file upload expected');
  }
  next();
});

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const {username, email, password} = req.body;
        //console.log(req.body)
        const user = new User({email, username, password});
        await user.save();
        res.status(201).send({message: "User registered successfully!"})
    } catch (error){
        console.error("Error registering user", error);
        res.status(500).send({message: "Error registering user", })
    }
})

// login user endpoint
router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    //console.log(email, password)
    try {
        const user = await User.findOne({email});
    if(!user) {
        return res.status(404).send({message: "User not found"})
    }
    const isMatch = await user.comparePassword(password);
    if(!isMatch) {
        return res.status(401).send({message: "Password not match"})
    }
    const { accessToken, refreshToken } = await generateToken(user._id, user.role);
    //console.log("token", token)

    // Store refreshToken in cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.cookie('token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });

    res.status(200).send({
        message: "Logged in successfully!",
        token: accessToken, 
        refreshToken: refreshToken,
        user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role, 
        profileImage: user.profileImage,
        bio: user.bio,
        profession: user.profession
        }
    });
    } catch (error) {
        console.error("Error logging user", error);
        res.status(500).send({message: "Error logging user", })
    }
})

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }
        
        // Verify the refresh token
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';
        const decoded = jwt.verify(refreshToken, refreshSecret);
        
        // Find the user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateToken(user._id, user.role);
        
        res.status(200).json({
            token: accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token has expired, please login again' });
        }
        
        res.status(401).json({ message: 'Invalid refresh token' });
    }
});

// admin credentials
router.post('/admin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Replace the below logic with actual admin authentication
    if (email === process.env.admin_email && password === process.env.admin_password) {
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY + '_refresh';
        
        // Generate access token (short-lived)
        const token = jwt.sign(
            { email, role: 'admin' }, 
            process.env.JWT_SECRET_KEY, 
            { expiresIn: '24h' }
        );
        
        // Generate refresh token (long-lived)
        const refreshToken = jwt.sign(
            { email, role: 'admin' },
            refreshSecret,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true, 
            token, 
            refreshToken
        });
    } else {
        res.json({success:false, message:""})
    }
});


// all users
/*router.get("/users", verifyToken, async(req, res) => {
     res.send({message: "Protected users"})
})
     */

// logout endpoint
router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.status(200).send({message: "Logged out successfully!"})
})

// delete a user
router.delete("/users/:_id", async (req, res) => {
    try {
       const {_id} = req.params;
       const user = await User.findByIdAndDelete(_id);
       if(!user) {
        return res.status(404).send({message: "User not found"})
       }
       res.status(200).send({message: "User deleted successfully"})
    } catch (error) {
        console.error("Error deleting user", error);
        res.status(500).send({message: "Error deleting user", })
    }
}); 

// get all users
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}, "id email role").sort({createdAt: -1});
        res.status(200).send(users)
    } catch (error) {
        console.error("Error fetching user", error);
        res.status(500).send({message: "Error fetching user", })
    }
});

// update user role
router.put("/users/:_id", async (req, res) => {
    try {
        const {_id} = req.params;
        const {role} = req.body;
        const user = await User.findByIdAndUpdate(_id, {role}, {new: true});
        if(!user) {
            return res.status(404).send({message: "user not found"})
        }
        res.status(200).send({message: "User role updated successfully", user})
    } catch (error) {
        console.error("Error updating user role", error);
        res.status(500).send({message: "Error updating user role", })
    }
})

// edit or update profile with file upload
router.patch("/edit-profile", upload.single('profileImage'), async (req, res) => {
    console.log('Processing profile update request');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    try {
        const {userId, username, profileImageUrl, bio, profession} = req.body;
        
        // Validate required params
        if(!userId) {
            console.log('Missing userId in request');
            return res.status(400).json({message: "User ID is required"});
        }
        
        console.log(`Looking for user with ID: ${userId}`);
        const user = await User.findById(userId);
        
        if(!user) {
            console.log(`User not found with ID: ${userId}`);
            return res.status(404).json({message: "User not found"});
        }

        console.log('User found, updating profile');
        
        // Update basic profile information
        if(username !== undefined) user.username = username;
        if(bio !== undefined) user.bio = bio;
        if(profession !== undefined) user.profession = profession;

        // Handle profile image (either from file upload or URL)
        if (req.file) {
            // If a file was uploaded, use its path
            const relativeFilePath = `/uploads/profiles/${req.file.filename}`;
            console.log('Setting profile image from file:', relativeFilePath);
            user.profileImage = relativeFilePath;
        } else if (profileImageUrl) {
            // If no file but URL provided, use the URL
            console.log('Setting profile image from URL:', profileImageUrl);
            user.profileImage = profileImageUrl;
        }

        console.log('Saving updated user profile');
        await user.save();
        
        // Respond with success and the updated user data
        const userResponse = {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role, 
        profileImage: user.profileImage,
        bio: user.bio,
        profession: user.profession
        };
        
        console.log('Profile updated successfully', userResponse);
        res.status(200).json({
            message: "Profile updated successfully!",
            user: userResponse
    });

    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({
            message: "Error updating user profile",
            error: error.message 
        });
    }
})

// Debug route for uploads
router.post('/test-upload', upload.single('testImage'), (req, res) => {
  try {
    console.log('Test upload received:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const relativeFilePath = `/uploads/profiles/${req.file.filename}`;
    res.status(200).json({ 
      message: 'File uploaded successfully', 
      file: req.file,
      relativePath: relativeFilePath,
      fullUrl: `${req.protocol}://${req.get('host')}${relativeFilePath}`
    });
  } catch (error) {
    console.error('Error in test upload:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

// Get current user endpoint
router.get("/current", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        
        // Get the user ID from the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userId = decoded.id;
        
        if (!userId) {
            return res.status(401).json({ message: "Invalid token" });
        }
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Return user data without sensitive information
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                profileImage: user.profileImage,
                bio: user.bio,
                profession: user.profession
            }
        });
    } catch (error) {
        console.error("Error fetching current user:", error);
        return res.status(500).json({ 
            message: "Error fetching user data", 
            error: error.message 
        });
    }
});

module.exports = router;