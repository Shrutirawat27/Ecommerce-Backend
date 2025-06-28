const verifyAdmin = (req, res, next) => {
    console.log("User Role:", req.user?.role);  
    if(!req.user || req.user.role !== "admin") {
        console.error("Unauthorized access attempt by user with role:", req.user?.role);
        return res.status(403).send({success: false, message: "You are not authorized to perform this action"});
    }
    next();
};

module.exports = verifyAdmin;