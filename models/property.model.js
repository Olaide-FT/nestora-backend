const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        listingType: {
            type: String,
            enum: ["sale", "rent", "shortlet"],
            required: true,
        },

        propertyType: {
            type: String,
            enum: ["house", "apartment", "duplex", "land", "office", "shop", "warehouse", "commercial"],
            required: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        bedrooms: {
            type: Number,
            default: 0,
            min: 0,
        },

        bathrooms: {
            type: Number,
            default: 0,
            min: 0,
        },

        squareFootage: {
            type: Number,
            min: 0,
        },

        address: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        zipCode: {
            type: String,
            trim: true,
        },

        images: {
            type: [String],
            default: [],
        },

        amenities: {
            type: [String],
            default: [],
        },

        approvalStatus: {
            type: String,
            enum: ["pending","approved","rejected"],
            default: "pending",
        },

        availabilityStatus: {
            type: String,
            enum: ["available","sold","rented",],
            default: "available",
        },

        rejectionReason: {
            type: String,
            default: null,
        },

        views: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;