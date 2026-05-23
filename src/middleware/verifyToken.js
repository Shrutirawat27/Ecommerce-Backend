const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

if (!process.env.JWT_SECRET_KEY) {
    console.error("ERROR: JWT_SECRET_KEY is not defined in .env file");
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send({
            message: "Token is required"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const objectId = new mongoose.Types.ObjectId(
            decoded.userId || decoded.id
        );

        req.user = {
            _id: objectId,
            role: decoded.role
        };

        next();

    } catch (error) {
        console.error("Token Verification Error:", error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({
                message: "Token has expired",
                needsRefresh: true
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({
                message: "Invalid token"
            });
        }

        res.status(401).send({
            message: "Error while verifying token"
        });
    }
};

module.exports = verifyToken;