const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const adminAuth = async (req, res, next) => {
    try {
        const token = req.headers["authorization"]?.split(" ")[1];
        if (!token) {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }
        //console.log("Received Token in Admin Auth:", token);
    
        const decoded = jwt.verify(token, JWT_SECRET);
        //console.log("Decoded Admin Token:", decoded);
        if (!decoded || decoded.role !== 'admin') {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }
        
        req.user = decoded; 
        next();
    } catch (error) {
        console.error(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "Token has expired", 
                needsRefresh: true 
            });
        }
        res.json({ success: false, message: error.message });
    }
};

module.exports = adminAuth;