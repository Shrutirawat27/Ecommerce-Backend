const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

if (!process.env.JWT_SECRET_KEY) {
    console.error("❌ ERROR: JWT_SECRET_KEY is not defined in .env file");
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    console.log("🔐 AUTH HEADER:", authHeader);
    console.log("🔐 TOKEN:", token);

    if (!token) {
        console.log("❌ NO TOKEN FOUND");
        return res.status(401).send({ message: "Token is required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        console.log("🔐 DECODED TOKEN PAYLOAD:", decoded);
        console.log("🔐 decoded.userId:", decoded.userId);
        console.log("🔐 decoded.role:", decoded.role);

        // ✅ Use 'new' with ObjectId
        const objectId = new mongoose.Types.ObjectId(decoded.userId || decoded.id);

        console.log("🔐 OBJECT ID (toString):", objectId.toString());
        console.log("🔐 OBJECT ID (raw):", objectId);

        req.user = {
            _id: objectId,
            role: decoded.role
        };

        console.log("✅ req.user SET AS:", {
            id: req.user._id.toString(),
            role: req.user.role
        });

        next();
    } catch (error) {
        console.error("❌ Token Verification Error:", error);

        if (error.name === 'TokenExpiredError') {
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
