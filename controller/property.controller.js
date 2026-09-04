const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Property = require("../models/property.model");
const User = require("../models/user.model");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const MAX_IMAGES = 10;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeImageUrls = (value) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];

    return values.map((image) => {
        if (typeof image !== "string" || !image.trim()) {
            throw new Error("Each image URL must be a non-empty string");
        }

        const url = new URL(image.trim());
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Image URLs must use HTTP or HTTPS");
        }

        return url.toString();
    });
};

const resolveImages = async (req, bodyImages) => {
    const images = normalizeImageUrls(bodyImages);

    for (const file of req.files || []) {
        const result = await uploadToCloudinary(file.buffer);
        images.push(result.secure_url);
    }

    if (images.length > MAX_IMAGES) {
        throw new Error(`A property can have at most ${MAX_IMAGES} images`);
    }

    return images;
};

const getRequestUser = (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    try {
        const token = authHeader.split(" ")[1];
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const createProperty = async (req, res) => {
    try {
        const {
            title,
            description,
            listingType,
            propertyType,
            price,
            bedrooms,
            bathrooms,
            squareFootage,
            address,
            city,
            state,
            zipCode,
            amenities,
            images: bodyImages,
            location,
        } = req.body;

        const resolvedAddress = address || location;

        if (!title ||!description || !listingType ||!propertyType ||price === undefined ||!resolvedAddress ||!city ||!state) {
            return res.status(400).json({message:"Please provide all required property fields"});
        }

        if (!Number.isFinite(Number(price))) {
            return res.status(400).json({message: "Price must be a valid number"});
        }

        if (Number(price) < 0) {
            return res.status(400).json({message: "Price cannot be negative"});
        }

        if (
            (bedrooms !== undefined && bedrooms !== "" && !Number.isFinite(Number(bedrooms))) ||
            (bathrooms !== undefined && bathrooms !== "" && !Number.isFinite(Number(bathrooms))) ||
            (squareFootage !== undefined && squareFootage !== "" && !Number.isFinite(Number(squareFootage)))
        ) {
            return res.status(400).json({ message: "Numeric property details are invalid" });
        }

        let images;
        try {
            images = await resolveImages(req, bodyImages);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        let parsedAmenities = [];

        if (amenities) {
            try {
                parsedAmenities = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
            } catch (error) {
                return res.status(400).json({message: "Invalid amenities format"});
            }
        }

        const property = await Property.create({
            owner: req.user.userId,

            title,
            description,
            listingType,
            propertyType,

            price: Number(price),

            bedrooms: Number(bedrooms) || 0,
            bathrooms: Number(bathrooms) || 0,

            squareFootage: squareFootage ? Number(squareFootage): undefined,

            address: resolvedAddress,
            city,
            state,
            zipCode,

            images,

            amenities: parsedAmenities,

            approvalStatus: "pending",

            availabilityStatus: "available",

            views: 0,
        });

        res.status(201).json({message: "Property created successfully",property});
    } catch (error) {
        console.error("Create Property Error:", error);

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({message: "Failed to create property"});
    }
};

const getProperties = async (req, res) => {
    try {
        const {
            search,
            location,
            listingType,
            propertyType,
            city,
            state,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            sort,
            page = 1,
            limit = 12,
        } = req.query;

        const filter = {approvalStatus: "approved"};

        // Search by title, city, or state
        const searchTerm = search || location;
        if (searchTerm) {
            filter.$or = [
                {
                    title: {
                        $regex: escapeRegex(searchTerm),
                        $options: "i",
                    },
                },
                {
                    city: {
                        $regex: escapeRegex(searchTerm),
                        $options: "i",
                    },
                },
                {
                    state: {
                        $regex: escapeRegex(searchTerm),
                        $options: "i",
                    },
                },
            ];
        }

        if (listingType) {
            filter.listingType = listingType;
        }

        if (propertyType) {
            filter.propertyType = propertyType;
        }

        if (city) {
            filter.city = { $regex: escapeRegex(city), $options: "i"};
        }

        if (state) {
            filter.state = {$regex: escapeRegex(state),$options: "i"};
        }

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        if (bedrooms) {
            filter.bedrooms = {$gte: Number(bedrooms)};
        }

        if (bathrooms) {
            filter.bathrooms = {$gte: Number(bathrooms)};
        }

        let sortOption = {createdAt: -1};

        if (sort === "price-low") {
            sortOption = {price: 1};
        }

        if (sort === "price-high") {
            sortOption = {price: -1};
        }

        if (sort === "oldest") {
            sortOption = {createdAt: 1};
        }

        if (sort === "views") {
            sortOption = {views: -1};
        }

        const currentPage = Math.max(Number(page),1);

        const pageLimit = Math.min(Math.max(Number(limit), 1),50);

        const skip = (currentPage - 1) * pageLimit;

        const properties =
            await Property.find(filter)
                .populate("owner","firstName lastName email phone")
                .sort(sortOption)
                .skip(skip)
                .limit(pageLimit);

        // Get total number of matching properties
        const total =
            await Property.countDocuments(filter);

        res.status(200).json({
            count: properties.length,
            total,
            page: currentPage,
            totalPages: Math.ceil(total / pageLimit),
            properties,
        });
    } catch (error) {
        console.error("Get Properties Error:",error);

        res.status(500).json({
            message: "Failed to get properties",
        });
    }
};

const getProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = getRequestUser(req);

        const property = await Property.findById(id).populate("owner", "firstName lastName email phone");

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        const isPubliclyVisible = property.approvalStatus === "approved";

        const isAuthorizedViewer =
            currentUser && (
                currentUser.role === "admin" ||
                (property.owner && property.owner._id && currentUser.userId && property.owner._id.toString() === currentUser.userId.toString())
            );

        if (!isPubliclyVisible && !isAuthorizedViewer) {
            return res.status(404).json({ message: "Property not found" });
        }

        if (isPubliclyVisible) {
            const viewedProperty = await Property.findByIdAndUpdate(
                id,
                {
                    $inc: {
                        views: 1,
                    },
                },
                {
                    new: true,
                }
            ).populate("owner", "firstName lastName email phone");

            return res.status(200).json({ property: viewedProperty });
        }

        return res.status(200).json({ property });
    } catch (error) {
        console.error("Get Property Error:", error);

        res.status(500).json({ message: "Failed to get property" });
    }
};

const getOwnerProfile = async (req, res) => {
    try {
        const { ownerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(ownerId)) {
            return res.status(404).json({ message: "Seller not found" });
        }

        // Match the visibility rule used by the public property-details page.
        // Older approved records may not have an availabilityStatus field.
        const properties = await Property.find({
            owner: ownerId,
            approvalStatus: "approved",
        })
            .populate("owner", "firstName lastName email phone")
            .sort({ createdAt: -1 });

        // If the owner has approved listings, return their profile normally.
        if (properties.length) {
            return res.status(200).json({
                owner: properties[0].owner,
                count: properties.length,
                properties,
            });
        }

        // Fallback: the seller may exist but simply have no approved listings
        // yet (e.g. all are pending/rejected). Look up the user directly so
        // the public seller page can still render their contact info.
        const seller = await User.findById(ownerId).select("firstName lastName email phone isActive role");

        if (!seller || !seller.isActive) {
            return res.status(404).json({ message: "Seller not found" });
        }

        // Only expose owner accounts publicly.
        if (seller.role !== "owner") {
            return res.status(404).json({ message: "Seller not found" });
        }

        const owner = {
            _id: seller._id,
            firstName: seller.firstName,
            lastName: seller.lastName,
            email: seller.email,
            phone: seller.phone,
        };

        return res.status(200).json({
            owner,
            count: 0,
            properties: [],
        });
    } catch (error) {
        console.error("Get Owner Profile Error:", error);
        return res.status(500).json({ message: "Failed to get seller profile" });
    }
};

const getMyProperties = async (req, res) => {
    try {
        const properties =
            await Property.find({
                owner: req.user.userId,
            }).sort({
                createdAt: -1,
            });

        res.status(200).json({count: properties.length, properties});
    } catch (error) {
        console.error("Get My Properties Error:",error);

        res.status(500).json({message:"Failed to get your properties",error});
    }
};

const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property =
            await Property.findById(id);

        if (!property) {
            return res.status(404).json({message: "Property not found"});
        }

        // Check ownership
        if (property.owner.toString() !==req.user.userId.toString()) {
            return res.status(403).json({message:"You are not authorized to update this property"});
        }

        const allowedFields = [
            "title",
            "description",
            "listingType",
            "propertyType",
            "price",
            "bedrooms",
            "bathrooms",
            "squareFootage",
            "address",
            "city",
            "state",
            "zipCode",
            "amenities",
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                property[field] =req.body[field];
            }
        });

        // When the form includes image data, replace the gallery with the submitted URLs and newly uploaded Cloudinary files.
        if (req.body.images !== undefined || (req.files && req.files.length > 0)) {
            try {
                property.images = await resolveImages(req, req.body.images);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        if (req.body.price !== undefined && Number(req.body.price) < 0) {
            return res.status(400).json({message:"Price cannot be negative"});
        }

        // Updating a property sends it back for admin review
        property.approvalStatus = "pending";
        property.rejectionReason = null;

        await property.save();

        res.status(200).json({message:"Property updated and sent for review",property});
    } catch (error) {
        console.error("Update Property Error:",error);

        res.status(500).json({message:"Failed to update property"});
    }
};

const updateAvailabilityStatus = async (req,res) => {
    try {
        const { id } = req.params;

        const { availabilityStatus } = req.body;

        const allowedStatuses = ["available","sold","rented",];

        if (!allowedStatuses.includes(availabilityStatus)
        ) {
            return res.status(400).json({message:"Invalid availability status"});
        }

        const property = await Property.findById(id);

        if (!property) {
            return res.status(404).json({ message: "Property not found"});
        }

        // Check ownership
        if (
            property.owner.toString() !== req.user.userId.toString()) {
            return res.status(403).json({message:"You are not authorized to update this property"});
        }

        // Property must be approved first
        if (property.approvalStatus !=="approved") {
            return res.status(400).json({ message:"Only approved properties can have their availability status changed"});
        }

        property.availabilityStatus = availabilityStatus;

        await property.save();

        res.status(200).json({
            message: "Property availability updated successfully", property});
    } catch (error) {
        console.error("Update Availability Error:", error);

        res.status(500).json({message:"Failed to update property availability"});
    }
};

const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property =
            await Property.findById(id);

        if (!property) {
            return res.status(404).json({
                message: "Property not found",
            });
        }

        // Admins can delete any property; owners can only delete their own.
        const isOwner = property.owner.toString() === req.user.userId.toString();
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({message:"You are not authorized to delete this property"});
        }

        await property.deleteOne();

        res.status(200).json({message:"Property deleted successfully"});
    } catch (error) {
        console.error("Delete Property Error:",error);

        res.status(500).json({message:"Failed to delete property"});
    }
};

module.exports = {
    createProperty,
    getProperties,
    getProperty,
    getOwnerProfile,
    getMyProperties,
    updateProperty,
    updateAvailabilityStatus,
    deleteProperty,
};
