const verifyAdmin = (req, res, next) => {
    console.log("User Role:", req.user?.role);  // Use optional chaining in case req.user is undefined
    if(req.user?.role !== "admin") {
        console.error("Unauthorized access attempt by user with role:", req.user?.role);
        return res.status(403).send({success: false, message: "You are not authorized to perform this action"});
    }
    next();
};

module.exports = verifyAdmin;
