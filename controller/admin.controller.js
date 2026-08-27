const Property = require("../models/property.model");
const User = require("../models/user.model");
// const sendMail = require("../utils/sendMail");
const Inquiry = require("../models/inquiry.model");

const sendApprovalEmail = require("../utils/sendApproval");
const sendRejectEmail = require("../utils/sendReject");
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDashboardStats = async (req, res) => {
    try {
        const [totalUsers, totalOwners, totalBuyers, totalProperties, pendingProperties, approvedProperties, soldProperties, totalInquiries,]
            = await Promise.all([
                User.countDocuments(),

                User.countDocuments({ role: "owner" }),

                User.countDocuments({ role: "buyer" }),

                Property.countDocuments(),

                Property.countDocuments({ approvalStatus: "pending" }),

                Property.countDocuments({ approvalStatus: "approved" }),

                Property.countDocuments({ availabilityStatus: "sold" }),

                Inquiry.countDocuments(),
            ]);

        res.status(200).json({
            stats: {
                totalUsers,
                totalOwners,
                totalBuyers,
                totalProperties,
                pendingProperties,
                approvedProperties,
                soldProperties,
                totalInquiries,
            },
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);

        res.status(500).json({ message: "Failed to get dashboard statistics" });
    }
};

const getPendingProperties = async (req, res) => {
    try {
        const properties = await Property.find({ approvalStatus: "pending", })
            .populate("owner", "firstName lastName email phone")
            .sort({ createdAt: -1 });

        res.status(200).json({ count: properties.length, properties });
    } catch (error) {
        console.error("Pending Properties Error:", error);

        res.status(500).json({ message: "Failed to get pending properties" });
    }
};

// APPROVE PROPERTY
const approveProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property = await Property.findById(id).populate("owner", "firstName lastName email");

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (property.approvalStatus === "approved") {
            return res.status(400).json({ message: "Property is already approved" });
        }

        property.approvalStatus = "approved";

        property.rejectionReason = null;

        await property.save();

        await sendApprovalEmail(property);

        res.status(200).json({ message: "Property approved successfully", property });
    } catch (error) {
        console.error("Approve Property Error:", error);

        res.status(500).json({ message: "Failed to approve property" });
    }
};


const rejectProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const rejectionReason = req.body.rejectionReason ?? req.body.reason;

        if (!rejectionReason || !String(rejectionReason).trim()) {
            return res.status(400).json({ message: "Rejection reason is required" });
        }

        const property = await Property.findById(id).populate("owner", "firstName lastName email");

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        property.approvalStatus = "rejected";

        property.rejectionReason = String(rejectionReason).trim();

        await property.save();

        await sendRejectEmail(property, property.rejectionReason);

        res.status(200).json({ message: "Property rejected successfully", property });
    } catch (error) {
        console.error("Reject Property Error:", error);

        res.status(500).json({ message: "Failed to reject property" });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { role, isActive, search, page = 1, limit = 20, } = req.query;

        const filter = {};

        if (role) { filter.role = role; }

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (search) {
            filter.$or = [
                {
                    firstName: {
                        $regex: escapeRegex(search),
                        $options: "i",
                    },
                },
                {
                    lastName: {
                        $regex: escapeRegex(search),
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: escapeRegex(search),
                        $options: "i",
                    },
                },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const users = await User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await User.countDocuments(filter);

        res.status(200).json({ count: users.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), users, });
    } catch (error) {
        console.error("Get Users Error:", error);

        res.status(500).json({ message: "Failed to get users" });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user._id.toString() === req.user.userId.toString()
        ) {
            return res.status(400).json({ message: "You cannot deactivate your own account" });
        }

        user.isActive = !user.isActive;

        await user.save();

        res.status(200).json({message: user.isActive ? "User activated successfully" : "User deactivated successfully",
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            }
        });
    } catch (error) {
        console.error("Toggle User Error:", error);

        res.status(500).json({ message: "Failed to update user status" });
    }
};

const getAllProperties = async (req, res) => {
    try {
        const { approvalStatus, availabilityStatus, page = 1, limit = 20 } = req.query;

        const filter = {};

        if (approvalStatus) {
            filter.approvalStatus = approvalStatus;
        }

        if (availabilityStatus) {
            filter.availabilityStatus = availabilityStatus;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const properties = await Property.find(filter)
            .populate("owner", "firstName lastName email phone")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Property.countDocuments(filter);

        res.status(200).json({ count: properties.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), properties });
    } catch (error) {
        console.error("Get All Properties Error:", error);

        res.status(500).json({ message: "Failed to get properties" });
    }
};

const deletePropertyByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const property = await Property.findById(id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        await property.deleteOne();

        res.status(200).json({ message: "Property deleted successfully" });
    } catch (error) {
        console.error("Delete Property By Admin Error:", error);

        res.status(500).json({ message: "Failed to delete property" });
    }
};

module.exports = {
    getDashboardStats,
    getPendingProperties,
    rejectProperty,
    approveProperty,
    getAllUsers,
    toggleUserStatus,
    getAllProperties,
    deletePropertyByAdmin,
};
