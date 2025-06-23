const jwt = require('jsonwebtoken');
if (!process.env.JWT_SECRET_KEY) {
    console.error("ERROR: JWT_SECRET_KEY is not defined in .env file");
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken = (req, res, next) => {
    console.log("Received Authorization Header:", req.headers["authorization"]);

    const token = req.headers["authorization"]?.split(" ")[1];
    console.log("Extracted Token:", token);

    if (!token) {
        return res.status(401).send({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Decoded Token:", decoded);  // Log the decoded token to check its content

        req.user = {
            _id: decoded.userId || decoded.id,  // Support both formats
            role: decoded.role
        };
        req.role = decoded.role;

        next();

    } catch (error) {
        console.error("Token Verification Error:", error);
        
        if (error.name === 'TokenExpiredError') {
            // Instead of just returning an error, include a flag that indicates refresh is needed
            return res.status(401).send({ 
                message: "Token has expired", 
                needsRefresh: true 
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ message: "Invalid token" });
        }
        res.status(401).send({ message: "Error while verifying token" });
    }
};

module.exports = verifyToken;
