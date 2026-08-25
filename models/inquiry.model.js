const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },

        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        buyerPhone: {
            type: String,
            required: true,
            trim: true,
        },

        buyerEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        status: {
            type: String,
            enum: [
                "new",
                "responded",
                "closed",
            ],
            default: "new",
        },

        response: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        respondedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);


const Inquiry = mongoose.model("Inquiry", inquirySchema);

module.exports = Inquiry;