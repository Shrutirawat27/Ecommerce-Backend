const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../users/user.model');

const createAdminUser = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log("Admin user already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash('admin_password', 10);
        const adminUser = new User({
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
        });

        await adminUser.save();
        console.log("Admin user created successfully!");
    } catch (error) {
        console.error("Error creating admin user:", error);
    } finally {
        mongoose.connection.close();
    }
};

createAdminUser();