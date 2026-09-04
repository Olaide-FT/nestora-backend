const Inquiry = require("../models/inquiry.model");
const Property = require("../models/property.model");
const User = require("../models/user.model");
const sendMail = require("../services/nodemailer")
const sendInquiryEmail = require("../utils/sendInquiryNotification");
const sendInquiryResponseEmail = require("../utils/sendInquiryResponse");
const createInquiry = async (req, res) => {
    try {
        const { propertyId, message } = req.body;

        if (!propertyId || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({message: "Property ID and a message are required"});
        }

        // Fetch full buyer profile from DB — JWT payload only carries userId and role,
        // so phone and email must be retrieved from the database.
        const buyer = await User.findById(req.user.userId).select("firstName lastName email phone");

        if (!buyer) {
            return res.status(404).json({ message: "Buyer account not found" });
        }

        const property = await Property.findOne({  _id: propertyId, approvalStatus: "approved", availabilityStatus: "available"})
            .populate( "owner", "firstName lastName email phone");

        if (!property) {
            return res.status(404).json({ message: "Property not found or unavailable"});
        }

        if ( property.owner._id.toString() === req.user.userId.toString()) {
            return res.status(403).json({ message: "You cannot send an inquiry about your own property"});
        }

        

        const inquiry =
            await Inquiry.create({
                property: property._id,
                buyer: req.user.userId,
                message: message.trim(),
                buyerPhone: buyer.phone,
                buyerEmail: buyer.email,
                status: "new",
            });
           

        await sendInquiryEmail( property, buyer, message.trim());

        res.status(201).json({ message: "Inquiry sent successfully", inquiry });

    } catch (error) {
        console.error("Create Inquiry Error:", error);

        res.status(500).json({ message: "Failed to send inquiry" });
    }
};

const getReceivedInquiries = async (req,res) => {
    try {
        const properties = await Property.find({ owner: req.user.userId}).select("_id");

        const propertyIds = properties.map((property) => property._id);

        const inquiries = await Inquiry.find({ property: {$in: propertyIds}})
                .populate(
                    "property",
                    "title price city state images"
                )
                .populate(
                    "buyer",
                    "firstName lastName email phone"
                )
                .sort({
                    createdAt: -1,
                });

        res.status(200).json({count: inquiries.length,inquiries});

    } catch (error) {
        console.error("Get Received Inquiries Error:",error);

        res.status(500).json({message:"Failed to get received inquiries"});
    }
};

const getSentInquiries = async (req, res) => {
    try {
        const inquiries = await Inquiry.find({ buyer: req.user.userId, })
            .populate("property", "title price city state images")
            .sort({ createdAt: -1 });

        res.status(200).json({ count: inquiries.length, inquiries });
    } catch (error) {
        console.error("Get Sent Inquiries Error:", error);

        res.status(500).json({ message: "Failed to get sent inquiries" });
    }
};

const getInquiry = async (req, res) => {
    try {
        const { id } = req.params;

        const inquiry =
            await Inquiry.findById(id)
                .populate("property", "title price city state images owner")
                .populate("buyer", "firstName lastName email phone");

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        const isBuyer = inquiry.buyer._id.toString() === req.user.userId.toString();

        const isOwner = inquiry.property.owner.toString() === req.user.userId.toString();

        if (!isBuyer && !isOwner) {
            return res.status(403).json({ message: "You are not authorized to view this inquiry" });
        }

        res.status(200).json({ inquiry });
    } catch (error) {
        console.error("Get Inquiry Error:", error);

        res.status(500).json({ message: "Failed to get inquiry" });
    }
};

// RESPOND TO INQUIRY
const respondToInquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        if (!response) {
            return res.status(400).json({ message: "Response message is required" });
        }

        const inquiry = await Inquiry.findById(id)
            .populate("property", "title owner")
            .populate("buyer", "firstName lastName email");

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        // Check if logged-in user owns the property
        if (inquiry.property.owner.toString() !== req.user.userId.toString()) {
            return res.status(403).json({ message: "You are not authorized to respond to this inquiry" });
        }

        inquiry.response = response.trim();

        inquiry.status = "responded";

        inquiry.respondedAt = new Date();

        await inquiry.save();

        await sendInquiryResponseEmail(inquiry, response);

        res.status(200).json({ message: "Inquiry response sent successfully", inquiry });
    } catch (error) {
        console.error(
            "Respond Inquiry Error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to respond to inquiry",
        });
    }
};

// CLOSE INQUIRY
const closeInquiry = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const inquiry =
            await Inquiry.findById(id)
                .populate(
                    "property",
                    "owner"
                );

        if (!inquiry) {
            return res.status(404).json({
                message: "Inquiry not found",
            });
        }

        // Only property owner can close it
        if (
            inquiry.property.owner.toString() !==
            req.user.userId.toString()
        ) {
            return res.status(403).json({
                message:
                    "You are not authorized to close this inquiry",
            });
        }

        inquiry.status = "closed";

        await inquiry.save();

        res.status(200).json({
            message:
                "Inquiry closed successfully",
            inquiry,
        });
    } catch (error) {
        console.error(
            "Close Inquiry Error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to close inquiry",
        });
    }
};

module.exports = {
    createInquiry,
    getReceivedInquiries,
    getSentInquiries,
    getInquiry,
    respondToInquiry,
    closeInquiry,
};
